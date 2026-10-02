import type { Finding, SubjectKind } from '../../schema';
import {
  ISSUE_QUERIES,
  type IssueCategory,
  packScopes,
  SWEEP_ORGS,
  scopeQualifiers,
} from './queries';
import { type SearchClient, type SearchItem, searchIssues } from './search';

export const LOOKBACK_DAYS = 180;

export type GithubIssueRow = {
  url: string;
  title: string;
  createdAt: string;
  state: 'open' | 'closed';
  repo: string;
  kind: 'issue' | 'pull_request';
  category: IssueCategory;
  query: string;
};

export type FindingDraft = Pick<Finding, 'type' | 'subject' | 'severity' | 'evidence' | 'tags'> & {
  subjectKind: SubjectKind;
};

export type GithubCensusInput = {
  client: SearchClient;
  snapshotTime: string;
  repos: readonly string[];
  emit: (draft: FindingDraft) => Promise<void>;
  writeDerived: (name: string, rows: unknown[]) => Promise<void>;
  log?: (event: Record<string, unknown>) => void;
};

export type GithubCensusStats = {
  queries: number;
  truncatedQueries: string[];
  failedQueries: string[];
  issues: number;
};

export const sinceDate = (snapshotTime: string, days = LOOKBACK_DAYS): string =>
  new Date(Date.parse(snapshotTime) - days * 86_400_000).toISOString().slice(0, 10);

const repoOf = (item: SearchItem): string =>
  item.repository_url.replace('https://api.github.com/repos/', '');

const toRow = (item: SearchItem, category: IssueCategory, query: string): GithubIssueRow => ({
  url: item.html_url,
  title: item.title,
  createdAt: item.created_at,
  state: item.state,
  repo: repoOf(item),
  kind: item.pull_request ? 'pull_request' : 'issue',
  category,
  query,
});

export const toFindingDraft = (row: GithubIssueRow): FindingDraft => ({
  type: row.category,
  subjectKind: 'repo',
  subject: row.url,
  severity: 'info',
  evidence: {
    url: row.url,
    title: row.title,
    createdAt: row.createdAt,
    state: row.state,
    repo: row.repo,
  },
  tags: ['github', row.kind, `repo:${row.repo}`],
});

export const runGithubCensus = async (input: GithubCensusInput): Promise<GithubCensusStats> => {
  const since = sinceDate(input.snapshotTime);
  const scopes = scopeQualifiers(input.repos, SWEEP_ORGS);
  const rows = new Map<string, GithubIssueRow>();
  const stats: GithubCensusStats = {
    queries: 0,
    truncatedQueries: [],
    failedQueries: [],
    issues: 0,
  };

  for (const { terms, category } of ISSUE_QUERIES) {
    const queries = [`${terms} created:>=${since}`, ...packScopes(terms, scopes, since)];
    for (const query of queries) {
      stats.queries++;
      const result = await searchIssues(input.client, query);
      if (!result.ok) {
        stats.failedQueries.push(query);
        input.log?.({ census: 'github', query, error: result.error.message });
        continue;
      }
      if (result.value.truncated) stats.truncatedQueries.push(query);
      for (const item of result.value.items) {
        if (!rows.has(item.html_url)) rows.set(item.html_url, toRow(item, category, terms));
      }
    }
  }

  const ordered = [...rows.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  await input.writeDerived('github_issues', ordered);
  for (const row of ordered) await input.emit(toFindingDraft(row));
  stats.issues = ordered.length;
  return stats;
};
