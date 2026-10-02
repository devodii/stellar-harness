import { execFileSync } from 'node:child_process';
import { appError, err, ok, type Result, Snapshot } from '@harness/schema';
import type { HorizonClient } from './horizon';

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

export type SnapshotOptions = { gitSha?: string; sampleGap?: number };

export const takeSnapshot = async (
  clients: { horizon: HorizonClient },
  { gitSha, sampleGap = SNAPSHOT_SAMPLE_GAP }: SnapshotOptions = {},
): Promise<Result<Snapshot>> => {
  const latest = await clients.horizon.latestLedger();
  if (!latest.ok) return latest;
  const earlier = await clients.horizon.ledger(latest.value.sequence - sampleGap);
  if (!earlier.ok) return earlier;
  const ledgerCloseSeconds = measureCloseSeconds(latest.value, earlier.value);
  const snapshot = Snapshot.safeParse({
    snapshotLedger: latest.value.sequence,
    snapshotTime: new Date(latest.value.closed_at).toISOString(),
    ledgerCloseSeconds,
    gitSha: gitSha ?? readGitSha(),
    network: 'mainnet',
  });
  if (snapshot.success) return ok(snapshot.data);
  return err(
    appError('UPSTREAM_FAILED', 'Horizon ledgers did not yield a valid snapshot', {
      latest: latest.value.sequence,
      ledgerCloseSeconds,
    }),
  );
};
