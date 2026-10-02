import { isPreventableCode } from '@harness/schema';
import type { FindingDraft } from './ports';

export const FAILED_TX_BY_CODE_CSV = 'failed_tx_by_code.csv';
export const FAILURE_CLUSTERS_CSV = 'failure_clusters.csv';

export const FAILED_TX_BY_CODE_COLUMNS = [
  'code',
  'count',
  'preventable',
  'share_of_failed',
] as const;

export type FailedTxByCodeRow = Record<(typeof FAILED_TX_BY_CODE_COLUMNS)[number], string | number>;

const SHARE_DECIMALS = 4;

export const failedTxByCodeRows = (
  byCode: Record<string, number>,
  txFailed: number,
): FailedTxByCodeRow[] =>
  Object.entries(byCode)
    .sort(([codeA, a], [codeB, b]) => b - a || codeA.localeCompare(codeB))
    .map(([code, count]) => ({
      code,
      count,
      preventable: isPreventableCode(code) ? 'yes' : 'no',
      share_of_failed: txFailed > 0 ? Number((count / txFailed).toFixed(SHARE_DECIMALS)) : 0,
    }));

export const FAILURE_CLUSTERS_COLUMNS = [
  'account',
  'type',
  'severity',
  'count',
  'first_ledger',
  'last_ledger',
  'same_ledger_collisions',
  'multisig',
  'home_domain',
  'funder',
  'top_destination',
  'asset',
  'sample_hash',
  'tags',
] as const;

export type FailureClusterRow = Record<(typeof FAILURE_CLUSTERS_COLUMNS)[number], string | number>;

type ClusterFinding = Pick<FindingDraft, 'type' | 'subject' | 'severity' | 'evidence' | 'tags'>;

const text = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
};

const count = (value: unknown): number => (typeof value === 'number' ? value : 0);

const firstOf = (value: unknown): string => (Array.isArray(value) ? text(value[0]) : '');

export const failureClusterRows = (findings: ClusterFinding[]): FailureClusterRow[] =>
  [...findings]
    .sort(
      (a, b) =>
        count(b.evidence.count) - count(a.evidence.count) || a.subject.localeCompare(b.subject),
    )
    .map((finding) => ({
      account: finding.subject,
      type: finding.type,
      severity: finding.severity,
      count: count(finding.evidence.count),
      first_ledger: count(finding.evidence.firstLedger),
      last_ledger: count(finding.evidence.lastLedger),
      same_ledger_collisions: count(finding.evidence.sameLedgerCollisions),
      multisig: text(finding.evidence.multisig),
      home_domain: text(finding.evidence.homeDomain),
      funder: text(finding.evidence.funder),
      top_destination: text(finding.evidence.topDestination),
      asset: text(finding.evidence.asset),
      sample_hash: firstOf(finding.evidence.sampleHashes),
      tags: finding.tags.join(';'),
    }));
