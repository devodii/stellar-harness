import type { LiveResponse, SummaryResponse } from './api-schemas';
import { summaryMetrics } from './summary';

export interface LedgerReading {
  sequence: number;
  closedAt: string;
}

export const buildLive = (
  ledger: LedgerReading | null,
  { summary, scanned }: SummaryResponse,
): LiveResponse => {
  const metrics = summaryMetrics(summary);
  const fromScan = <T>(value: T): T | null => (scanned ? value : null);
  return {
    latestLedger: ledger?.sequence ?? null,
    closedAt: ledger?.closedAt ?? null,
    ledgerCloseSeconds: fromScan(summary.snapshot.ledgerCloseSeconds),
    window: {
      days: scanned ? metrics.windowDays : 0,
      txFailed: fromScan(metrics.txFailed),
      preventable: fromScan(metrics.preventable),
      preventableShare: scanned ? metrics.preventableShare : null,
    },
    archivedContracts: fromScan(metrics.archivedContracts),
    anchorsFailing: fromScan(metrics.anchorsFailing),
    scanned,
    horizonOk: ledger !== null,
  };
};
