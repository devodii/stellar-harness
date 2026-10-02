import { describe, expect, it } from 'vitest';
import { ok } from '../../schema';
import { type FindingDraft, runGithubCensus, sinceDate, toFindingDraft } from './census';
import type { Fetcher, HttpResponse } from './ports';
import { MAX_QUERY_LENGTH, packScopes } from './queries';
import { searchIssues } from './search';
import { summarizeGithub } from './summary';

const response = (
  body: unknown,
  status = 200,
  headers: Record<string, string> = {},
): HttpResponse => ({
  url: 'https://api.github.com/search/issues',
  status,
  headers,
  body: JSON.stringify(body),
  ms: 1,
  cached: false,
});

const item = (n: number, overrides: Record<string, unknown> = {}) => ({
  html_url: `https://github.com/acme/soroban-app/issues/${n}`,
  title: `TTL bug ${n}`,
  created_at: `2026-09-${String(10 + (n % 15)).padStart(2, '0')}T00:00:00Z`,
  state: n % 2 ? 'open' : 'closed',
  repository_url: 'https://api.github.com/repos/acme/soroban-app',
  ...overrides,
});

const page = (items: unknown[], total = items.length) => ({
  total_count: total,
  incomplete_results: false,
  items,
});

const noSleep = async () => {};

describe('packScopes', () => {
  it('keeps every packed query under the length limit', () => {
    const repos = Array.from({ length: 40 }, (_, i) => `org-${i}/repository-name-${i}`);
    const packed = packScopes(
      '"instance storage" archived',
      repos.map((r) => `repo:${r}`),
      '2026-04-05',
    );
    expect(packed.length).toBeGreaterThan(1);
    for (const query of packed) expect(query.length).toBeLessThanOrEqual(MAX_QUERY_LENGTH);
    expect(packed.join(' ').match(/repo:/g)).toHaveLength(40);
  });
});

describe('searchIssues', () => {
  it('pages until the result set is exhausted', async () => {
    const pages = [
      page(
        Array.from({ length: 100 }, (_, i) => item(i)),
        130,
      ),
      page([item(200)], 130),
    ];
    const fetch: Fetcher = async () => ok(response(pages.shift()));
    const result = await searchIssues({ fetch, token: 't', sleep: noSleep }, 'q');
    expect(result.ok && result.value.items).toHaveLength(101);
  });

  it('waits out a rate limit and retries', async () => {
    const slept: number[] = [];
    const replies = [
      response({}, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '100' }),
      response(page([item(1)])),
    ];
    const fetch: Fetcher = async () => ok(replies.shift() as HttpResponse);
    const result = await searchIssues(
      { fetch, token: 't', sleep: async (ms) => void slept.push(ms), now: () => 90_000 },
      'q',
    );
    expect(result.ok).toBe(true);
    expect(slept).toEqual([11_000]);
  });

  it('flags truncated result sets', async () => {
    const full = page(
      Array.from({ length: 100 }, (_, i) => item(i)),
      5000,
    );
    const fetch: Fetcher = async () => ok(response(full));
    const result = await searchIssues({ fetch, token: 't', sleep: noSleep }, 'q');
    expect(result.ok && result.value).toMatchObject({ truncated: true });
    expect(result.ok && result.value.items).toHaveLength(1000);
  });
});

describe('runGithubCensus', () => {
  it('dedupes issues across queries and emits one finding each', async () => {
    const fetch: Fetcher = async () => ok(response(page([item(1), item(2, { pull_request: {} })])));
    const drafts: FindingDraft[] = [];
    const derived: unknown[][] = [];
    const stats = await runGithubCensus({
      client: { fetch, token: 't', sleep: noSleep },
      snapshotTime: '2026-10-02T00:00:00.000Z',
      repos: [],
      emit: async (draft) => void drafts.push(draft),
      writeDerived: async (_, rows) => void derived.push(rows),
    });
    expect(stats.issues).toBe(2);
    expect(drafts.map((d) => d.type)).toEqual(['REPO_TTL_ISSUE', 'REPO_TTL_ISSUE']);
    expect(drafts.find((d) => d.tags.includes('pull_request'))).toBeDefined();
    expect(derived[0]).toHaveLength(2);
  });
});

describe('helpers', () => {
  it('computes the lookback start date from the snapshot', () => {
    expect(sinceDate('2026-10-02T00:00:00.000Z')).toBe('2026-04-05');
  });

  it('summarizes by category with open counts', () => {
    const rows = [1, 2, 3].map((n) => ({
      url: `u${n}`,
      title: 't',
      createdAt: `2026-09-0${n}T00:00:00Z`,
      state: n === 1 ? ('closed' as const) : ('open' as const),
      repo: 'a/b',
      kind: 'issue' as const,
      category: 'REPO_TTL_ISSUE' as const,
      query: 'q',
    }));
    const summary = summarizeGithub(rows);
    expect(summary.byCategory.REPO_TTL_ISSUE).toEqual({ total: 3, open: 2 });
    expect(summary.recent[0]?.url).toBe('u3');
    expect(toFindingDraft(rows[0]!).subjectKind).toBe('repo');
  });
});
