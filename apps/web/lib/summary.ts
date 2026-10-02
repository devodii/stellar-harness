import type { Summary } from '@harness/schema';
import { ratio } from './format';

export const hasScanData = (summary: Summary): boolean =>
  summary.failures.txScanned > 0 ||
  summary.contracts.total > 0 ||
  summary.anchors.domainsTested > 0;

export const windowDays = (summary: Summary): number => {
  const ms = Date.parse(summary.failures.windowEnd) - Date.parse(summary.failures.windowStart);
  return Math.max(0, Math.round(ms / 86_400_000));
};

export const topCodes = (byCode: Record<string, number>, limit = 5): [string, number][] =>
  Object.entries(byCode)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

export const summaryMetrics = (summary: Summary) => ({
  txFailed: summary.failures.txFailed,
  txScanned: summary.failures.txScanned,
  failedShare: ratio(summary.failures.txFailed, summary.failures.txScanned),
  preventable: summary.failures.preventable.total,
  preventableShare: ratio(summary.failures.preventable.total, summary.failures.txFailed),
  clusters: summary.failures.clusters.count,
  archivedContracts: summary.contracts.archivedInstances,
  archivedMeaningful: summary.contracts.archivedMeaningful,
  expiring30d: summary.contracts.expiring30d,
  expiring30dMeaningful: summary.contracts.expiring30dMeaningful,
  anchorsTested: summary.anchors.domainsTested,
  anchorsFailing: summary.anchors.failing.length,
  rentXlm12m: summary.rent.totalXlm12m,
  windowDays: windowDays(summary),
});

export type SummaryMetrics = ReturnType<typeof summaryMetrics>;
