import type { FindingType } from '../../schema';

export type IssueCategory = Extract<
  FindingType,
  'REPO_TTL_ISSUE' | 'REPO_TX_FAILURE_ISSUE' | 'REPO_ANCHOR_CONFORMANCE_ISSUE'
>;

export type IssueQuery = { terms: string; category: IssueCategory };

export const ISSUE_QUERIES: readonly IssueQuery[] = [
  { terms: 'extend_ttl', category: 'REPO_TTL_ISSUE' },
  { terms: 'RestoreFootprint', category: 'REPO_TTL_ISSUE' },
  { terms: '"instance storage" archived', category: 'REPO_TTL_ISSUE' },
  { terms: 'liveUntilLedger', category: 'REPO_TTL_ISSUE' },
  { terms: 'tx_bad_seq', category: 'REPO_TX_FAILURE_ISSUE' },
  { terms: 'op_no_trust', category: 'REPO_TX_FAILURE_ISSUE' },
  { terms: 'op_underfunded', category: 'REPO_TX_FAILURE_ISSUE' },
  { terms: '"channel accounts" stellar', category: 'REPO_TX_FAILURE_ISSUE' },
  { terms: 'stellar-anchor-tests', category: 'REPO_ANCHOR_CONFORMANCE_ISSUE' },
  { terms: '"stellar.toml" SEP-24', category: 'REPO_ANCHOR_CONFORMANCE_ISSUE' },
  { terms: '"anchor platform" reconciliation', category: 'REPO_ANCHOR_CONFORMANCE_ISSUE' },
];

export const SWEEP_ORGS = ['stellar', 'stellar-expert', 'stellar-experimental'] as const;

export const MAX_QUERY_LENGTH = 256;

export const scopeQualifiers = (repos: readonly string[], orgs: readonly string[]): string[] => [
  ...orgs.map((org) => `org:${org}`),
  ...repos.map((repo) => `repo:${repo}`),
];

export const packScopes = (
  terms: string,
  qualifiers: readonly string[],
  since: string,
): string[] => {
  const base = `${terms} created:>=${since}`;
  const groups: string[] = [];
  let current = base;
  for (const qualifier of qualifiers) {
    const next = `${current} ${qualifier}`;
    if (next.length > MAX_QUERY_LENGTH && current !== base) {
      groups.push(current);
      current = `${base} ${qualifier}`;
    } else {
      current = next;
    }
  }
  if (current !== base) groups.push(current);
  return groups;
};
