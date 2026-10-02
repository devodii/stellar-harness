import type { LedgerEntryResult } from './ports';
import type { TtlStatus } from './schemas';

export const SECONDS_PER_DAY = 86_400;
export const EXPIRING_SOON_DAYS = 30;
export const EXPIRING_LATER_DAYS = 90;

export type TtlClock = { snapshotLedger: number; ledgerCloseSeconds: number };

export const ledgersForDays = (days: number, ledgerCloseSeconds: number): number =>
  Math.ceil((days * SECONDS_PER_DAY) / ledgerCloseSeconds);

export const daysForLedgers = (ledgers: number, ledgerCloseSeconds: number): number =>
  Math.round(((ledgers * ledgerCloseSeconds) / SECONDS_PER_DAY) * 100) / 100;

export const classifyTtl = (entry: LedgerEntryResult | undefined, clock: TtlClock): TtlStatus => {
  if (!entry) {
    return {
      present: false,
      liveUntilLedgerSeq: null,
      ledgersLeft: null,
      daysLeft: null,
      archived: true,
      expiring30d: false,
      expiring90d: false,
    };
  }
  const liveUntil = entry.liveUntilLedgerSeq ?? 0;
  const archived = liveUntil < clock.snapshotLedger;
  const ledgersLeft = archived ? 0 : liveUntil - clock.snapshotLedger;
  const daysLeft = daysForLedgers(ledgersLeft, clock.ledgerCloseSeconds);
  return {
    present: true,
    liveUntilLedgerSeq: liveUntil,
    ledgersLeft,
    daysLeft,
    archived,
    expiring30d: !archived && daysLeft <= EXPIRING_SOON_DAYS,
    expiring90d: !archived && daysLeft > EXPIRING_SOON_DAYS && daysLeft <= EXPIRING_LATER_DAYS,
  };
};
