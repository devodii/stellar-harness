import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Snapshot } from '@harness/schema';
import {
  createClients,
  createPorts,
  DiskCache,
  type HostStats,
  type HttpGap,
  loadNetworkConfig,
  type NetworkClients,
  type NetworkConfig,
  NoCache,
  type Ports,
  stderrLogger,
  takeSnapshot,
} from '@harness/stellar-tools';
import { z } from 'zod';
import { createDerivedWriter, derivedPath } from '../core/derived';
import {
  createFindingSink,
  type FindingInput,
  type FindingSink,
  makeFinding,
} from '../core/findings';
import { formatProgress, runTasks } from '../core/runner';
import { createStateStore, snapshotStore } from '../core/state';

export type ScanOptions = {
  dataDir: string;
  noCache?: boolean;
  newSnapshot?: boolean;
  limit?: number;
  windowSeconds?: number;
  concurrency?: Record<string, number>;
  env?: Record<string, string | undefined>;
  log?: (line: string) => void;
};

export type RunOutcome<T, R> = { results: R[]; failures: { task: T; error: unknown }[] };

export type Run = <T, R>(
  tasks: T[],
  worker: (task: T) => Promise<R>,
  opts: { concurrency: number; label: string },
) => Promise<RunOutcome<T, R>>;

export type ScanContext = {
  options: ScanOptions;
  config: NetworkConfig;
  clients: NetworkClients;
  ports: Ports;
  snapshot: Snapshot;
  sink: FindingSink;
  gaps: HttpGap[];
  run: Run;
  emit: (draft: FindingInput) => Promise<void>;
  writeDerived: (name: string, rows: unknown[]) => Promise<void>;
  resetDerived: (...names: string[]) => Promise<void>;
  checkpointer: (census: string) => (state: Record<string, unknown>) => Promise<void>;
  readCheckpoint: (census: string) => Promise<Record<string, unknown> | null>;
  stats: () => HostStats;
  log: (line: string) => void;
};

const CheckpointState = z.record(z.string(), z.unknown());

const resetForSnapshot = async (dataDir: string) => {
  await rm(join(dataDir, 'findings.jsonl'), { force: true });
  await rm(join(dataDir, 'derived'), { recursive: true, force: true });
  await rm(join(dataDir, 'state'), { recursive: true, force: true });
};

const resolveSnapshot = async (
  clients: NetworkClients,
  dataDir: string,
  fresh: boolean,
): Promise<Snapshot> => {
  const store = snapshotStore(dataDir);
  const existing = fresh ? null : await store.read();
  if (existing) return existing;
  await resetForSnapshot(dataDir);
  const taken = await takeSnapshot(clients, { gitSha: process.env.GIT_SHA });
  if (!taken.ok) throw new Error(`Could not take a snapshot: ${taken.error.message}`);
  await store.write(taken.value);
  return taken.value;
};

const createRun =
  (log: (line: string) => void): Run =>
  async <T, R>(
    tasks: T[],
    worker: (task: T) => Promise<R>,
    { concurrency, label }: { concurrency: number; label: string },
  ) => {
    const results: R[] = [];
    const summary = await runTasks(tasks, (task) => worker(task), {
      concurrency,
      total: tasks.length,
      onResult: (result) => {
        results.push(result);
      },
      onProgress: (progress) => log(`[${label}] ${formatProgress(progress)}`),
    });
    return {
      results,
      failures: summary.failures.map(({ task, error }) => ({ task, error })),
    };
  };

export const createScanContext = async (options: ScanOptions): Promise<ScanContext> => {
  const log = options.log ?? ((line: string) => process.stderr.write(`${line}\n`));
  const config = loadNetworkConfig(options.env);
  const gaps: HttpGap[] = [];
  const clients = createClients(config, {
    cache: options.noCache ? new NoCache() : new DiskCache(options.dataDir),
    log: stderrLogger,
    limits: options.concurrency,
    onGap: (gap) => gaps.push(gap),
  });
  const snapshot = await resolveSnapshot(clients, options.dataDir, options.newSnapshot ?? false);
  const sink = createFindingSink(options.dataDir);
  const stores = new Map<string, ReturnType<typeof createStateStore<typeof CheckpointState>>>();
  const store = (census: string) => {
    const existing = stores.get(census);
    if (existing) return existing;
    const created = createStateStore(options.dataDir, census, CheckpointState);
    stores.set(census, created);
    return created;
  };

  return {
    options,
    config,
    clients,
    ports: createPorts(clients),
    snapshot,
    sink,
    gaps,
    run: createRun(log),
    emit: async (draft) => {
      await sink.emit(makeFinding(draft, snapshot));
    },
    writeDerived: async (name, rows) => {
      const writer = createDerivedWriter(options.dataDir, name);
      await writer.writeMany(rows);
      await writer.close();
    },
    resetDerived: async (...names) => {
      await Promise.all(
        names.map((name) => rm(derivedPath(options.dataDir, name), { force: true })),
      );
    },
    checkpointer: (census) => (state) => store(census).write(state),
    readCheckpoint: (census) => store(census).read(),
    stats: () => clients.http.stats.totals(),
    log,
  };
};
