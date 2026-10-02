import type { Snapshot } from '../../schema';
import { appError, err, ok, type Result } from '../../schema';
import type { RpcPort } from './ports';

const UNIT_SECONDS = { s: 1, m: 60, h: 3600, d: 86_400 } as const;

export const DEFAULT_FAILURE_WINDOW = '7d';
export const DEFAULT_RETENTION_MARGIN_LEDGERS = 720;
const RETENTION_PROBE_OFFSET = 10;

export const parseWindowSeconds = (value: string | number): number => {
  if (typeof value === 'number') return value;
  const match = /^(\d+(?:\.\d+)?)([smhd])$/.exec(value.trim());
  if (!match) throw new Error(`Invalid failure window "${value}", expected e.g. 7d, 24h, 30m`);
  return Number(match[1]) * UNIT_SECONDS[match[2] as keyof typeof UNIT_SECONDS];
};

export type Retention = { oldestLedger: number; latestLedger: number };

export const probeRetention = async (
  rpc: RpcPort,
  snapshotLedger: number,
): Promise<Result<Retention>> => {
  const page = await rpc.getTransactions({
    startLedger: snapshotLedger - RETENTION_PROBE_OFFSET,
    limit: 1,
  });
  if (!page.ok) return page;
  return ok({ oldestLedger: page.value.oldestLedger, latestLedger: page.value.latestLedger });
};

export type FailureWindow = {
  windowSeconds: number;
  requestedStartLedger: number;
  startLedger: number;
  endLedger: number;
  ledgers: number;
  clamped: boolean;
  clampReason?: 'retention' | 'limit';
  retentionOldestLedger: number;
  startTime: string;
  endTime: string;
};

export type ResolveWindowInput = {
  windowSeconds: number;
  snapshot: Snapshot;
  retention: Retention;
  retentionMarginLedgers?: number;
  limitLedgers?: number;
};

export const ledgerTime = (snapshot: Snapshot, ledger: number): string => {
  const offsetMs = (snapshot.snapshotLedger - ledger) * snapshot.ledgerCloseSeconds * 1000;
  return new Date(Date.parse(snapshot.snapshotTime) - offsetMs).toISOString();
};

export const resolveWindow = (input: ResolveWindowInput): Result<FailureWindow> => {
  const { snapshot, retention, windowSeconds } = input;
  const margin = input.retentionMarginLedgers ?? DEFAULT_RETENTION_MARGIN_LEDGERS;
  const endLedger = Math.min(snapshot.snapshotLedger, retention.latestLedger);
  const windowLedgers = Math.max(1, Math.ceil(windowSeconds / snapshot.ledgerCloseSeconds));
  const requestedStartLedger = endLedger - windowLedgers + 1;
  const earliestSafe = retention.oldestLedger + margin;

  let startLedger = requestedStartLedger;
  let clampReason: FailureWindow['clampReason'];
  if (startLedger < earliestSafe) {
    startLedger = earliestSafe;
    clampReason = 'retention';
  }
  if (input.limitLedgers !== undefined && endLedger - startLedger + 1 > input.limitLedgers) {
    startLedger = endLedger - input.limitLedgers + 1;
    clampReason = 'limit';
  }
  if (startLedger > endLedger) {
    return err(
      appError('UPSTREAM_FAILED', 'RPC retention does not cover the snapshot ledger', {
        ...retention,
        snapshotLedger: snapshot.snapshotLedger,
      }),
    );
  }

  return ok({
    windowSeconds,
    requestedStartLedger,
    startLedger,
    endLedger,
    ledgers: endLedger - startLedger + 1,
    clamped: clampReason !== undefined,
    clampReason,
    retentionOldestLedger: retention.oldestLedger,
    startTime: ledgerTime(snapshot, startLedger),
    endTime: ledgerTime(snapshot, endLedger),
  });
};
