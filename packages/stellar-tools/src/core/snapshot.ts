import { execFileSync } from 'node:child_process';
import {
  appError,
  DEFAULT_NETWORK,
  err,
  type Network,
  ok,
  type Result,
  Snapshot,
} from '@harness/schema';
import type { HorizonClient } from './horizon';
import type { RpcClient } from './rpc';

export const SNAPSHOT_SAMPLE_GAP = 2000;
const SECONDS_PER_DAY = 86_400;

export const readGitSha = (cwd = process.cwd()): string => {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return /^[0-9a-f]{40}$/.test(sha) ? sha : 'unknown';
  } catch {
    return 'unknown';
  }
};

export const ledgersForDays = (days: number, closeSeconds: number): number =>
  Math.round((days * SECONDS_PER_DAY) / closeSeconds);

export const daysForLedgers = (ledgers: number, closeSeconds: number): number =>
  (ledgers * closeSeconds) / SECONDS_PER_DAY;

export const measureCloseSeconds = (
  later: { sequence: number; closed_at: string },
  earlier: { sequence: number; closed_at: string },
): number => {
  const seconds = (Date.parse(later.closed_at) - Date.parse(earlier.closed_at)) / 1000;
  return Math.round((seconds / (later.sequence - earlier.sequence)) * 10_000) / 10_000;
};

export type SnapshotOptions = { gitSha?: string; sampleGap?: number; network?: Network };

export type SnapshotClients = { horizon: HorizonClient; rpc?: Pick<RpcClient, 'getHealth'> };

type ClosedLedger = { sequence: number; closed_at: string };
type LedgerPair = { latest: ClosedLedger; earlier: ClosedLedger; source: string };

const horizonLedgers = async (
  horizon: HorizonClient,
  sampleGap: number,
): Promise<Result<LedgerPair>> => {
  const latest = await horizon.latestLedger();
  if (!latest.ok) return latest;
  const earlier = await horizon.ledger(latest.value.sequence - sampleGap);
  if (!earlier.ok) return earlier;
  return ok({ latest: latest.value, earlier: earlier.value, source: 'Horizon' });
};

const isoFromSeconds = (seconds: number): string => new Date(seconds * 1000).toISOString();

export const rpcLedgers = async (
  rpc: Pick<RpcClient, 'getHealth'>,
): Promise<Result<LedgerPair>> => {
  const health = await rpc.getHealth();
  if (!health.ok) return health;
  const { latestLedger, latestLedgerCloseTime, oldestLedger, oldestLedgerCloseTime } = health.value;
  if (!latestLedgerCloseTime || !oldestLedgerCloseTime || latestLedger <= oldestLedger) {
    return err(appError('UPSTREAM_FAILED', 'RPC getHealth returned no ledger close times'));
  }
  return ok({
    latest: { sequence: latestLedger, closed_at: isoFromSeconds(latestLedgerCloseTime) },
    earlier: { sequence: oldestLedger, closed_at: isoFromSeconds(oldestLedgerCloseTime) },
    source: 'RPC',
  });
};

export const takeSnapshot = async (
  clients: SnapshotClients,
  { gitSha, sampleGap = SNAPSHOT_SAMPLE_GAP, network = DEFAULT_NETWORK }: SnapshotOptions = {},
): Promise<Result<Snapshot>> => {
  const fromHorizon = await horizonLedgers(clients.horizon, sampleGap);
  const fromRpc = !fromHorizon.ok && clients.rpc ? await rpcLedgers(clients.rpc) : null;
  const ledgers = fromRpc?.ok ? fromRpc : fromHorizon;
  if (!ledgers.ok) return ledgers;
  const { latest, earlier, source } = ledgers.value;
  const ledgerCloseSeconds = measureCloseSeconds(latest, earlier);
  const snapshot = Snapshot.safeParse({
    snapshotLedger: latest.sequence,
    snapshotTime: new Date(latest.closed_at).toISOString(),
    ledgerCloseSeconds,
    gitSha: gitSha ?? readGitSha(),
    network,
  });
  if (snapshot.success) return ok(snapshot.data);
  return err(
    appError('UPSTREAM_FAILED', `${source} ledgers did not yield a valid snapshot`, {
      latest: latest.sequence,
      ledgerCloseSeconds,
    }),
  );
};
