import { createCache } from '@harness/storage';
import { z } from 'zod';
import {
  createFindingSink,
  type FindingInput,
  type FindingSink,
  makeFinding,
} from '../core/findings';
import { formatProgress, runTasks } from '../core/runner';
import { createStateStore } from '../core/state';
import type { Snapshot } from '../schema';
import { DEFAULT_NETWORK, type Network } from '../schema';
import { type Cache, createClients, DiskCache, type HostStats, type HttpGap, loadNetworkConfig, type NetworkClients, type NetworkConfig, NoCache, stderrLogger, takeSnapshot, withRpcAccountFallback } from '../stellar';
import { type HorizonStatus, probeHorizon, unavailableHorizon } from './horizon';
import { createPersistence, type ScanPersistence } from './persistence';
import { createPorts, type Ports } from './ports';

export type ScanOptions = {
  dataDir: string;
  network?: Network;
  cache?: Cache;
  databaseUrl?: string;
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
  persistence: ScanPersistence;
  sink: FindingSink;
  gaps: HttpGap[];
  run: Run;
  emit: (draft: FindingInput) => Promise<void>;
  writeDerived: (name: string, rows: unknown[]) => Promise<void>;
  resetDerived: (...names: string[]) => Promise<void>;
  readDerived: (name: string) => AsyncIterable<unknown>;
  writeDerivedJson: (relativePath: string, data: unknown) => Promise<void>;
  checkpointer: (census: string) => (state: Record<string, unknown>) => Promise<void>;
  readCheckpoint: (census: string) => Promise<Record<string, unknown> | null>;
  stats: () => HostStats;
  log: (line: string) => void;
  horizon: HorizonStatus;
  notes: string[];
};

const CheckpointState = z.record(z.string(), z.unknown());

const resolveSnapshot = async (
  clients: NetworkClients,
  persistence: ScanPersistence,
  fresh: boolean,
  horizon: HorizonStatus,
): Promise<Snapshot> => {
  const network = clients.config.NETWORK;
  const existing = fresh ? null : await persistence.getSnapshot();
  if (existing?.network === network) return existing;
  await persistence.resetForSnapshot();
  const taken = await takeSnapshot(clients, {
    gitSha: process.env.GIT_SHA,
    network,
    skipHorizon: !horizon.available,
  });
  if (!taken.ok) throw new Error(`Could not take a snapshot: ${taken.error.message}`);
  await persistence.putSnapshot(taken.value);
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

export const selectCache = ({
  noCache,
  cache,
  dataDir,
  databaseUrl,
  network,
}: ScanOptions): Cache => {
  if (noCache) return new NoCache();
  return (
    cache ??
    createCache({ dataDir, network: network ?? DEFAULT_NETWORK, databaseUrl }) ??
    new DiskCache(dataDir)
  );
};

export const scanPorts = (
  clients: NetworkClients,
  status: HorizonStatus = { available: true },
): Ports => {
  const ports = createPorts(clients);
  const horizon = status.available ? ports.horizon : unavailableHorizon(status.note);
  return { ...ports, horizon: withRpcAccountFallback(horizon, ports.rpc) };
};

export const createScanContext = async (options: ScanOptions): Promise<ScanContext> => {
  const log = options.log ?? ((line: string) => process.stderr.write(`${line}\n`));
  const network = options.network ?? DEFAULT_NETWORK;
  const config = loadNetworkConfig(options.env, network);
  const persistence = await createPersistence(options.dataDir, network, options.databaseUrl);
  const gaps: HttpGap[] = [];
  const clients = createClients(config, {
    cache: selectCache(options),
    log: stderrLogger,
    limits: options.concurrency,
    onGap: (gap) => gaps.push(gap),
  });
  const horizon = await probeHorizon(clients);
  if (!horizon.available) log(`[scan] ${horizon.note}`);
  const snapshot = await resolveSnapshot(
    clients,
    persistence,
    options.newSnapshot ?? false,
    horizon,
  );
  const sink = createFindingSink(persistence.storage);
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
    ports: scanPorts(clients, horizon),
    snapshot,
    persistence,
    sink,
    gaps,
    run: createRun(log),
    emit: async (draft) => {
      await sink.emit(makeFinding(draft, snapshot));
    },
    writeDerived: (name, rows) => persistence.appendDerived(name, rows),
    resetDerived: (...names) => persistence.clearDerived(...names),
    readDerived: (name) => persistence.readDerived(name),
    writeDerivedJson: (relativePath, data) =>
      persistence.putArtifact('derived', relativePath.replace(/\.json$/, ''), data),
    checkpointer: (census) => (state) => store(census).write(state),
    readCheckpoint: (census) => store(census).read(),
    stats: () => clients.http.stats.totals(),
    log,
    horizon,
    notes: horizon.available ? [] : [horizon.note],
  };
};
