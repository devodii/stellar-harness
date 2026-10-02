import type { FailuresSummary, Snapshot } from '../../schema';
import { appError, err, ok, type Result } from '../../schema';
import { type FailureAggregate, FailureAggregator } from './aggregate';
import { DEFAULT_CHUNK_LEDGERS, type LedgerChunk, planChunks, scanChunk } from './chunks';
import { type ClassificationGap, classifyAccounts } from './classify';
import { ClusterAccumulator, type ClusterThresholds } from './clusters';
import { type Decoders, type ExtractError, extractFailed } from './extract';
import { toFindingDraft } from './findings';
import type {
  Checkpoint,
  Emit,
  FindingDraft,
  HorizonPort,
  RpcPort,
  Runner,
  WriteDerived,
} from './ports';
import {
  type ChunkPlan,
  ContiguousProgress,
  type FailuresCheckpoint,
  isResuming,
  remainingChunks,
  resumeStateFor,
} from './progress';
import { DERIVED_FAILED_TX, DERIVED_LEDGER_TOTALS, FailedTx, LedgerTotal } from './rows';
import { summarizeAggregate } from './summary';
import {
  DEFAULT_FAILURE_WINDOW,
  type FailureWindow,
  parseWindowSeconds,
  probeRetention,
  resolveWindow,
} from './window';

export type DerivedSource = (name: string) => AsyncIterable<unknown> | Iterable<unknown>;

export type FailuresCensusDeps = Decoders & {
  rpc: RpcPort;
  horizon: HorizonPort;
  run: Runner;
  emit: Emit;
  writeDerived: WriteDerived;
  resetDerived?: (name: string) => Promise<void>;
  readDerived?: DerivedSource;
  checkpoint: Checkpoint<FailuresCheckpoint>;
  previousCheckpoint?: FailuresCheckpoint;
  now?: () => number;
};

export type FailuresCensusOptions = {
  snapshot: Snapshot;
  window?: string | number;
  chunkLedgers?: number;
  sampleEvery?: number;
  rpcConcurrency?: number;
  horizonConcurrency?: number;
  thresholds?: ClusterThresholds;
  anchorDomains?: ReadonlySet<string>;
  limitLedgers?: number;
  retentionMarginLedgers?: number;
  channelMinAccounts?: number;
  pageLimit?: number;
};

export type FailuresCensusStats = {
  ledgers: number;
  tx: number;
  failed: number;
  failedRows: number;
  decodeErrors: number;
  calls: { rpc: number; horizon: number };
  elapsedMs: number;
  scanMs: number;
  ledgersPerSecond: number;
  txPerSecond: number;
  rpcCallsPerSecond: number;
  chunks: { planned: number; scanned: number; failed: number; resumed: number };
  sampleEvery: number;
};

export type ChunkFailure = { chunk: LedgerChunk; message: string };

export type FailuresCensusResult = {
  window: FailureWindow;
  checkpoint: FailuresCheckpoint;
  aggregate: FailureAggregate;
  summary: FailuresSummary;
  findings: FindingDraft[];
  stats: FailuresCensusStats;
  gaps: {
    chunks: ChunkFailure[];
    decode: ExtractError[];
    classification: ClassificationGap[];
  };
};

type ScannedChunk = { chunk: LedgerChunk; rows: FailedTx[]; totals: LedgerTotal[] };

const DEFAULT_RPC_CONCURRENCY = 8;
const DEFAULT_HORIZON_CONCURRENCY = 8;
const MAX_DECODE_ERROR_SAMPLES = 50;

const perSecond = (count: number, ms: number) => (ms > 0 ? (count * 1000) / ms : 0);

const message = (error: unknown): string => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error && 'message' in error) return String(error.message);
  return String(error);
};

const rehydrate = async (
  source: DerivedSource,
  aggregator: FailureAggregator,
  clusters: ClusterAccumulator,
) => {
  for await (const raw of source(DERIVED_LEDGER_TOTALS)) {
    aggregator.addLedgerTotals([LedgerTotal.parse(raw)]);
  }
  for await (const raw of source(DERIVED_FAILED_TX)) {
    const row = FailedTx.parse(raw);
    aggregator.addFailed([row]);
    clusters.add([row]);
  }
};

export const runFailuresCensus = async (
  deps: FailuresCensusDeps,
  options: FailuresCensusOptions,
): Promise<Result<FailuresCensusResult>> => {
  const now = deps.now ?? Date.now;
  const started = now();
  let rpcCalls = 0;

  const retention = await probeRetention(deps.rpc, options.snapshot.snapshotLedger);
  rpcCalls += 1;
  if (!retention.ok) return retention;

  const resolved = resolveWindow({
    windowSeconds: parseWindowSeconds(options.window ?? DEFAULT_FAILURE_WINDOW),
    snapshot: options.snapshot,
    retention: retention.value,
    retentionMarginLedgers: options.retentionMarginLedgers,
    limitLedgers: options.limitLedgers,
  });
  if (!resolved.ok) return resolved;
  const window = resolved.value;

  const plan: ChunkPlan = {
    startLedger: window.startLedger,
    endLedger: window.endLedger,
    chunkLedgers: options.chunkLedgers ?? DEFAULT_CHUNK_LEDGERS,
    sampleEvery: options.sampleEvery ?? 1,
  };
  const chunks = planChunks(plan.startLedger, plan.endLedger, plan);
  const resume = resumeStateFor(deps.previousCheckpoint, plan);
  const resuming = isResuming(resume, plan);
  const aggregator = new FailureAggregator();
  const clusters = new ClusterAccumulator();

  if (resuming) {
    if (!deps.readDerived) {
      return err(appError('INTERNAL', 'Resuming the failures census requires readDerived'));
    }
    await rehydrate(deps.readDerived, aggregator, clusters);
  } else {
    await deps.resetDerived?.(DERIVED_FAILED_TX);
    await deps.resetDerived?.(DERIVED_LEDGER_TOTALS);
  }

  const todo = remainingChunks(chunks, resume);
  const progress = new ContiguousProgress<ScannedChunk>(
    chunks,
    resume.completedThrough,
    resume.completedChunkIds,
  );
  const completedChunkIds = [...resume.completedChunkIds];
  const decodeErrors: ExtractError[] = [];
  let decodeErrorCount = 0;
  let txSeen = 0;
  let scanned = 0;
  let ledgersScanned = 0;
  const chunkById = new Map(chunks.map((chunk) => [chunk.id, chunk]));

  const checkpointState = (): FailuresCheckpoint => ({
    ...plan,
    completedThrough: progress.completedThrough,
    completedChunkIds: completedChunkIds.filter(
      (id) => (chunkById.get(id)?.end ?? 0) > progress.completedThrough,
    ),
  });

  const persist = async (ready: ScannedChunk[], pastGap: boolean) => {
    for (const result of ready) {
      await deps.writeDerived(DERIVED_FAILED_TX, result.rows);
      await deps.writeDerived(DERIVED_LEDGER_TOTALS, result.totals);
      aggregator.addLedgerTotals(result.totals);
      aggregator.addFailed(result.rows);
      clusters.add(result.rows);
      if (pastGap) completedChunkIds.push(result.chunk.id);
    }
    if (ready.length > 0) await deps.checkpoint(checkpointState());
  };

  let flushing: Promise<void> = Promise.resolve();
  const flush = (ready: ScannedChunk[], pastGap: boolean) => {
    flushing = flushing.then(() => persist(ready, pastGap));
    return flushing;
  };

  const worker = async (chunk: LedgerChunk): Promise<void> => {
    const scan = await scanChunk(deps.rpc, chunk, { pageLimit: options.pageLimit });
    if (!scan.ok) {
      const calls = scan.error.meta?.calls;
      rpcCalls += typeof calls === 'number' ? calls : 1;
      throw new Error(scan.error.message);
    }
    rpcCalls += scan.value.calls;
    txSeen += scan.value.txSeen;
    scanned += 1;
    ledgersScanned += chunk.end - chunk.start + 1;
    const { rows, errors } = extractFailed(scan.value.failed, deps);
    decodeErrorCount += errors.length;
    decodeErrors.push(...errors.slice(0, MAX_DECODE_ERROR_SAMPLES - decodeErrors.length));
    const ready = progress.complete({ chunk, rows, totals: scan.value.totals });
    await flush(ready, false);
  };

  const concurrency = options.rpcConcurrency ?? DEFAULT_RPC_CONCURRENCY;
  const scanStarted = now();
  const first = await deps.run(todo, worker, { concurrency, label: 'failures:chunks' });
  const retry = await deps.run(
    first.failures.map((failure) => failure.task),
    worker,
    { concurrency: 1, label: 'failures:chunks:retry' },
  );
  await flush(progress.drain(), true);
  await flushing;
  const scanMs = now() - scanStarted;

  const clusterCandidates = clusters.clusters(options.thresholds);
  const accounts = [...new Set(clusterCandidates.map((c) => c.account))];
  const classified = await classifyAccounts({
    accounts,
    horizon: deps.horizon,
    run: deps.run,
    concurrency: options.horizonConcurrency ?? DEFAULT_HORIZON_CONCURRENCY,
    activity: (account) => clusters.activity(account),
    anchorDomains: options.anchorDomains,
    channelMinAccounts: options.channelMinAccounts,
  });

  const findings = clusterCandidates.map((cluster) =>
    toFindingDraft(cluster, classified.byAccount.get(cluster.account)),
  );
  for (const finding of findings) await deps.emit(finding);

  const aggregate = aggregator.result();
  const elapsedMs = now() - started;
  return ok({
    window,
    checkpoint: checkpointState(),
    aggregate,
    summary: summarizeAggregate(aggregate, window, findings),
    findings,
    stats: {
      ledgers: aggregate.ledgersScanned,
      tx: aggregate.txScanned,
      failed: aggregate.txFailed,
      failedRows: aggregate.failedRows,
      decodeErrors: decodeErrorCount,
      calls: { rpc: rpcCalls, horizon: classified.calls },
      elapsedMs,
      scanMs,
      ledgersPerSecond: perSecond(ledgersScanned, scanMs),
      txPerSecond: perSecond(txSeen, scanMs),
      rpcCallsPerSecond: perSecond(rpcCalls, scanMs),
      chunks: {
        planned: chunks.length,
        scanned,
        failed: retry.failures.length,
        resumed: chunks.length - todo.length,
      },
      sampleEvery: plan.sampleEvery,
    },
    gaps: {
      chunks: retry.failures.map((failure) => ({
        chunk: failure.task,
        message: message(failure.error),
      })),
      decode: decodeErrors,
      classification: classified.gaps,
    },
  });
};
