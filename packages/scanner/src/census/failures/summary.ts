import { FailuresSummary, type Snapshot } from '../../schema';
import { type FailureAggregate, FailureAggregator } from './aggregate';
import type { FindingDraft } from './ports';
import type { FailedTx, LedgerTotal } from './rows';
import { ledgerTime } from './window';

export const ANCHOR_DISTRIBUTION_TAG = 'anchor_distribution';

export type ClusterFindingLike = Pick<FindingDraft, 'tags' | 'evidence'>;

export type SummaryWindow = { startTime: string; endTime: string };

const anchorDomains = (findings: ClusterFindingLike[]): string[] => {
  const domains = new Set<string>();
  for (const finding of findings) {
    if (!finding.tags.includes(ANCHOR_DISTRIBUTION_TAG)) continue;
    const domain = finding.evidence.homeDomain;
    if (typeof domain === 'string' && domain.length > 0) domains.add(domain.toLowerCase());
  }
  return [...domains].sort();
};

export const summarizeAggregate = (
  aggregate: FailureAggregate,
  window: SummaryWindow,
  clusterFindings: ClusterFindingLike[],
): FailuresSummary =>
  FailuresSummary.parse({
    windowStart: window.startTime,
    windowEnd: window.endTime,
    ledgersScanned: aggregate.ledgersScanned,
    txScanned: aggregate.txScanned,
    txFailed: aggregate.txFailed,
    byCode: aggregate.byCode,
    preventable: aggregate.preventable,
    clusters: {
      count: clusterFindings.length,
      anchorDistribution: clusterFindings.filter((f) => f.tags.includes(ANCHOR_DISTRIBUTION_TAG))
        .length,
      domains: anchorDomains(clusterFindings),
    },
  });

export type FailuresSummaryInput = {
  snapshot: Snapshot;
  ledgerTotals: Iterable<LedgerTotal>;
  failedTx: Iterable<FailedTx>;
  clusterFindings: ClusterFindingLike[];
  window?: SummaryWindow;
};

const windowFromTotals = (snapshot: Snapshot, totals: LedgerTotal[]): SummaryWindow => {
  if (totals.length === 0) {
    return { startTime: snapshot.snapshotTime, endTime: snapshot.snapshotTime };
  }
  let first = Number.POSITIVE_INFINITY;
  let last = 0;
  for (const { ledger } of totals) {
    first = Math.min(first, ledger);
    last = Math.max(last, ledger);
  }
  return { startTime: ledgerTime(snapshot, first), endTime: ledgerTime(snapshot, last) };
};

export const failuresSummary = (input: FailuresSummaryInput): FailuresSummary => {
  const totals = [...input.ledgerTotals];
  const aggregator = new FailureAggregator();
  aggregator.addLedgerTotals(totals);
  aggregator.addFailed(input.failedTx);
  return summarizeAggregate(
    aggregator.result(),
    input.window ?? windowFromTotals(input.snapshot, totals),
    input.clusterFindings,
  );
};
