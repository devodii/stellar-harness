import type { Network } from '@harness/schema';
import type { LiveResponse, SummaryResponse } from './api-schemas';
import type { LedgerReading } from './latest-ledger';
import { summaryMetrics } from './summary';

export const buildLive = (
  network: Network,
  ledger: LedgerReading | null,
  { summary, scanned }: SummaryResponse,
): LiveResponse => {
  const metrics = summaryMetrics(summary);
  const fromScan = <T>(value: T): T | null => (scanned ? value : null);
  return {
    network,
    latestLedger: ledger?.sequence ?? null,
    closedAt: ledger?.closedAt ?? null,
    ledgerSource: ledger?.source ?? null,
    ledgerCloseSeconds: fromScan(summary.snapshot.ledgerCloseSeconds),
    window: {
      days: scanned ? metrics.windowDays : 0,
      txFailed: fromScan(metrics.txFailed),
      preventable: fromScan(metrics.preventable),
      preventableShare: scanned ? metrics.preventableShare : null,
    },
    archivedContracts: fromScan(metrics.archivedContracts),
    archivedMeaningful: fromScan(metrics.archivedMeaningful),
    anchorsFailing: fromScan(metrics.anchorsFailing),
    scanned,
    horizonOk: ledger?.source === 'horizon',
  };
};
