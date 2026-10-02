import type { GithubSummary } from '@harness/schema';
import type { GithubIssueRow } from './census';

export const RECENT_LIMIT = 20;

export const summarizeGithub = (rows: readonly GithubIssueRow[]): GithubSummary => {
  const byCategory: GithubSummary['byCategory'] = {};
  for (const row of rows) {
    const bucket = byCategory[row.category] ?? { total: 0, open: 0 };
    bucket.total++;
    if (row.state === 'open') bucket.open++;
    byCategory[row.category] = bucket;
  }
  const recent = [...rows]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, RECENT_LIMIT)
    .map(({ url, title, createdAt, state, category }) => ({
      url,
      title,
      createdAt,
      state,
      category,
    }));
  return { byCategory, recent };
};

export const GITHUB_CSV_COLUMNS = [
  'url',
  'title',
  'createdAt',
  'state',
  'repo',
  'kind',
  'category',
  'query',
] as const satisfies readonly (keyof GithubIssueRow)[];
