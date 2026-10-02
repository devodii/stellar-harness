import { z } from 'zod';
import { appError, err, ok, type Result } from '../../schema';
import type { Fetcher, HttpResponse, Sleep } from './ports';

export const GITHUB_API = 'https://api.github.com';
export const PER_PAGE = 100;
export const MAX_RESULTS = 1000;

export const SearchItem = z.object({
  html_url: z.url(),
  title: z.string(),
  created_at: z.iso.datetime(),
  state: z.enum(['open', 'closed']),
  repository_url: z.url(),
  pull_request: z.object({}).loose().optional(),
});
export type SearchItem = z.infer<typeof SearchItem>;

const SearchPage = z.object({
  total_count: z.number().int(),
  incomplete_results: z.boolean(),
  items: z.array(SearchItem),
});

export type SearchClient = {
  fetch: Fetcher;
  token: string;
  sleep: Sleep;
  now?: () => number;
};

const rateLimitWaitMs = (response: HttpResponse, now: number): number | null => {
  if (response.status !== 403 && response.status !== 429) return null;
  const retryAfter = Number(response.headers['retry-after']);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;
  const reset = Number(response.headers['x-ratelimit-reset']);
  if (response.headers['x-ratelimit-remaining'] === '0' && Number.isFinite(reset)) {
    return Math.max(reset * 1000 - now, 0) + 1000;
  }
  return null;
};

const MAX_RATE_LIMIT_WAITS = 5;

const getPage = async (
  client: SearchClient,
  query: string,
  page: number,
): Promise<Result<z.infer<typeof SearchPage>>> => {
  const url = `${GITHUB_API}/search/issues?q=${encodeURIComponent(query)}&per_page=${PER_PAGE}&page=${page}&sort=created&order=desc`;
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_WAITS; attempt++) {
    const response = await client.fetch(url, {
      headers: {
        accept: 'application/vnd.github+json',
        authorization: `Bearer ${client.token}`,
        'x-github-api-version': '2022-11-28',
      },
    });
    if (!response.ok) return response;
    const wait = rateLimitWaitMs(response.value, client.now?.() ?? Date.now());
    if (wait !== null) {
      await client.sleep(wait);
      continue;
    }
    if (response.value.status !== 200) {
      return err(
        appError('UPSTREAM_FAILED', `GitHub search returned ${response.value.status}`, { query }),
      );
    }
    return ok(SearchPage.parse(JSON.parse(response.value.body)));
  }
  return err(appError('RATE_LIMITED', 'GitHub search rate limit not lifted', { query }));
};

export type SearchOutcome = { items: SearchItem[]; totalCount: number; truncated: boolean };

export const searchIssues = async (
  client: SearchClient,
  query: string,
): Promise<Result<SearchOutcome>> => {
  const items: SearchItem[] = [];
  let totalCount = 0;
  for (let page = 1; page * PER_PAGE <= MAX_RESULTS; page++) {
    const result = await getPage(client, query, page);
    if (!result.ok) return result;
    totalCount = result.value.total_count;
    items.push(...result.value.items);
    if (result.value.items.length < PER_PAGE || items.length >= totalCount) break;
  }
  return ok({ items, totalCount, truncated: totalCount > MAX_RESULTS });
};
