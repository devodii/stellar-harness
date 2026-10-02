import type { NetworkSelection } from '@harness/stellar-tools';
import {
  type AnchorProbeResult,
  type AnchorToml,
  type ProbeAnchorOptions,
  probeAnchor,
  type RunAnchorTests,
} from '@harness/stellar-tools/anchors';
import { runSafeAnchorTests } from './anchor-tests';
import { mergeCandidates, transitiveCandidates } from './domains';
import { keyedLimiter, limitFetchPerHost } from './limit';
import type {
  Checkpoint,
  Emit,
  Fetcher,
  HorizonPort,
  RunTasks,
  WriteDerived,
  WriteJson,
} from './ports';
import type { AnchorCensusState, AnchorDomain, AnchorProbeRow } from './schemas';

export const ANCHOR_PROBE_TABLE = 'anchor_probe';
export const ANCHOR_DOMAINS_FILE = 'anchor_domains.json';
export const anchorTestsFile = (domain: string): string => `anchor_tests/${domain}.json`;

export const DEFAULT_PER_HOST = 2;
export const DEFAULT_GLOBAL = 32;
const CHECKPOINT_EVERY_MS = 30_000;

export type ProbeDomain = (domain: string, opts: ProbeAnchorOptions) => Promise<AnchorProbeResult>;

export const makeAnchorProbe = (
  ports: { fetch: Fetcher; horizon: HorizonPort },
  {
    perHost = DEFAULT_PER_HOST,
    runAnchorTests = runSafeAnchorTests,
    network,
    networkPassphrase,
  }: { perHost?: number; runAnchorTests?: RunAnchorTests } & NetworkSelection = {},
): ProbeDomain => {
  const fetch = limitFetchPerHost(ports.fetch, perHost);
  const testsLimit = keyedLimiter(perHost);
  const limitedTests: RunAnchorTests = (domain, seps) =>
    testsLimit(domain, () => runAnchorTests(domain, seps));
  return (domain, opts) =>
    probeAnchor(
      domain,
      { fetch, horizon: ports.horizon, runAnchorTests: limitedTests, network, networkPassphrase },
      opts,
    );
};

export const domainTags = (domain: AnchorDomain): string[] => [
  'anchor',
  ...domain.regions.map((region) => `region:${region}`),
  ...domain.scfRounds.map((round) => `scf_round_${round}`),
  ...(domain.country ? [`country:${domain.country}`] : []),
];

export const probeRows = (result: AnchorProbeResult): AnchorProbeRow[] =>
  result.stages.map(({ stage, ok, status, ms, error }) => ({
    domain: result.domain,
    stage,
    ok,
    status,
    ms,
    error,
  }));

export type AnchorCensusDeps = {
  probe: ProbeDomain;
  run: RunTasks;
  emit: Emit;
  writeDerived: WriteDerived;
  writeJson: WriteJson;
  checkpoint: Checkpoint<AnchorCensusState>;
  now?: () => number;
};

export type AnchorCensusOptions = {
  runAnchorTests?: boolean;
  concurrency?: number;
  transitive?: boolean;
  resume?: AnchorCensusState | null;
  checkpointEveryMs?: number;
};

export type AnchorCensusResult = {
  domains: AnchorDomain[];
  results: AnchorProbeResult[];
  failures: { domain: string; error: string }[];
  skipped: number;
};

export const runAnchorCensus = async (
  domains: AnchorDomain[],
  deps: AnchorCensusDeps,
  opts: AnchorCensusOptions = {},
): Promise<AnchorCensusResult> => {
  const now = deps.now ?? Date.now;
  const every = opts.checkpointEveryMs ?? CHECKPOINT_EVERY_MS;
  const state: AnchorCensusState = {
    lastDomain: opts.resume?.lastDomain ?? null,
    completed: [...(opts.resume?.completed ?? [])],
  };
  const completed = new Set(state.completed);
  const results: AnchorProbeResult[] = [];
  const failures: AnchorCensusResult['failures'] = [];
  let lastCheckpoint = now();

  const maybeCheckpoint = async () => {
    if (now() - lastCheckpoint < every) return;
    lastCheckpoint = now();
    await deps.checkpoint({ ...state, completed: [...state.completed] });
  };

  const probeOne = async (domain: AnchorDomain): Promise<AnchorProbeResult> => {
    const result = await deps.probe(domain.domain, {
      runAnchorTests: opts.runAnchorTests ?? true,
      tags: domainTags(domain),
    });
    await deps.writeDerived(ANCHOR_PROBE_TABLE, probeRows(result));
    if (result.anchorTests)
      await deps.writeJson(anchorTestsFile(result.domain), result.anchorTests);
    for (const finding of result.findings) await deps.emit(finding);
    completed.add(domain.domain);
    state.completed.push(domain.domain);
    state.lastDomain = domain.domain;
    await maybeCheckpoint();
    return result;
  };

  const probeAll = async (batch: AnchorDomain[], label: string) => {
    const pending = batch.filter((d) => !completed.has(d.domain));
    const outcome = await deps.run(pending, probeOne, {
      concurrency: opts.concurrency ?? DEFAULT_GLOBAL,
      label,
    });
    results.push(...outcome.results);
    failures.push(
      ...outcome.failures.map(({ task, error }) => ({
        domain: task.domain,
        error: error instanceof Error ? error.message : String(error),
      })),
    );
    return batch.length - pending.length;
  };

  let skipped = await probeAll(domains, 'anchors');
  let all = domains;
  if (opts.transitive ?? true) {
    const tomls = results.map((r) => r.toml).filter((t): t is AnchorToml => t !== null);
    const discovered = mergeCandidates(
      transitiveCandidates(
        tomls,
        all.map((d) => d.domain),
      ),
    );
    all = [...domains, ...discovered];
    skipped += await probeAll(discovered, 'anchors:transitive');
  }

  await deps.writeJson(ANCHOR_DOMAINS_FILE, all);
  await deps.checkpoint({ ...state, completed: [...state.completed] });
  return { domains: all, results, failures, skipped };
};
