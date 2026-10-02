import { z } from 'zod';
import { appError, err, ok, type Result } from '../../schema';
import type { Fetcher } from './ports';

const RepoPage = z.object({
  meta: z.object({ counts: z.object({ returned: z.number().int(), total: z.number().int() }) }),
  repos: z.array(z.object({ fullName: z.string() })),
});

const REPO_PAGE_SIZE = 100;

export const fetchScoredRepos = async (
  fetch: Fetcher,
  stellarlightUrl: string,
  minScore: number,
): Promise<Result<string[]>> => {
  const repos: string[] = [];
  for (let offset = 0; ; offset += REPO_PAGE_SIZE) {
    const url = `${stellarlightUrl}/api/repos/search?minScore=${minScore}&limit=${REPO_PAGE_SIZE}&offset=${offset}`;
    const response = await fetch(url);
    if (!response.ok) return response;
    if (response.value.status !== 200) {
      return err(appError('UPSTREAM_FAILED', `stellarlight returned ${response.value.status}`));
    }
    const page = RepoPage.parse(JSON.parse(response.value.body));
    repos.push(...page.repos.map((repo) => repo.fullName));
    if (page.repos.length === 0 || offset + page.meta.counts.returned >= page.meta.counts.total) {
      return ok(repos);
    }
  }
};

const RepoSearch = z.object({ items: z.array(z.object({ full_name: z.string() })) });

export const fetchOrgReposMatching = async (
  fetch: Fetcher,
  token: string,
  org: string,
  nameTerm: string,
): Promise<Result<string[]>> => {
  const q = encodeURIComponent(`org:${org} ${nameTerm} in:name`);
  const response = await fetch(`https://api.github.com/search/repositories?q=${q}&per_page=100`, {
    headers: { accept: 'application/vnd.github+json', authorization: `Bearer ${token}` },
  });
  if (!response.ok) return response;
  if (response.value.status !== 200) {
    return err(appError('UPSTREAM_FAILED', `GitHub repo search returned ${response.value.status}`));
  }
  return ok(RepoSearch.parse(JSON.parse(response.value.body)).items.map((item) => item.full_name));
};
