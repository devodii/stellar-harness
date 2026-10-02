import { describe, expect, it } from 'vitest';
import {
  fetchAnchorProjects,
  fetchPartners,
  partnersUrl,
  projectSearchUrl,
  searchProjectByName,
} from './stellarlight';
import { fakeFetcher, jsonRoute, readJsonFixture } from './testing';

const BASE = 'https://stellarlight.xyz';

describe('fetchPartners', () => {
  it('reads anchor partners with their toml and region fields', async () => {
    const fetch = fakeFetcher({
      [partnersUrl(BASE, 'anchor')]: jsonRoute(
        readJsonFixture('stellarlight/partners-anchor.json'),
      ),
    });
    const result = await fetchPartners(fetch, BASE, 'anchor');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.find((p) => p.slug === 'clpx')).toMatchObject({
      name: 'CLPX',
      tomlSourceUrl: 'https://clpx.finance/.well-known/stellar.toml',
      seps: ['sep-6', 'sep-24', 'sep-31'],
      country: 'Chile',
      regions: ['latam'],
    });
    expect(fetch.calls[0]?.url).toBe(
      'https://stellarlight.xyz/api/partners?type=anchor&all=1&limit=100',
    );
  });

  it('returns an empty list for an empty partner type', async () => {
    const fetch = fakeFetcher({
      [partnersUrl(BASE, 'on-off-ramp')]: jsonRoute(
        readJsonFixture('stellarlight/partners-on-off-ramp.json'),
      ),
    });
    expect(await fetchPartners(fetch, BASE, 'on-off-ramp')).toEqual({ ok: true, value: [] });
  });

  it('surfaces http failures', async () => {
    const fetch = fakeFetcher({ [partnersUrl(BASE, 'anchor')]: { status: 503 } });
    const result = await fetchPartners(fetch, BASE, 'anchor');
    expect(result.ok).toBe(false);
  });
});

describe('project search', () => {
  it('pages anchor projects until the total is reached', async () => {
    const page = readJsonFixture<{ meta: { counts: object }; projects: unknown[] }>(
      'stellarlight/projects-anchor.json',
    );
    const first = {
      ...page,
      meta: { counts: { returned: 5, total: 9 } },
      projects: page.projects.slice(0, 5),
    };
    const second = {
      ...page,
      meta: { counts: { returned: 4, total: 9 } },
      projects: page.projects.slice(5),
    };
    const fetch = fakeFetcher({
      [projectSearchUrl(BASE, { type: 'Anchor', limit: 100, offset: 0 })]: jsonRoute(first),
      [projectSearchUrl(BASE, { type: 'Anchor', limit: 100, offset: 5 })]: jsonRoute(second),
    });
    const result = await fetchAnchorProjects(fetch, BASE);
    expect(result.ok && result.value.map((p) => p.slug)).toHaveLength(9);
    expect(fetch.calls).toHaveLength(2);
  });

  it('resolves a project by exact name', async () => {
    const fetch = fakeFetcher({
      [projectSearchUrl(BASE, { q: 'Minisend', limit: 5 })]: jsonRoute(
        readJsonFixture('stellarlight/project-search-minisend.json'),
      ),
    });
    const result = await searchProjectByName(fetch, BASE, 'Minisend');
    expect(result.ok && result.value?.links?.website).toBe('https://minisend.xyz/');
  });

  it('returns null when no name matches', async () => {
    const fetch = fakeFetcher({
      [projectSearchUrl(BASE, { q: 'Nope', limit: 5 })]: jsonRoute(
        readJsonFixture('stellarlight/project-search-minisend.json'),
      ),
    });
    expect(await searchProjectByName(fetch, BASE, 'Nope')).toEqual({ ok: true, value: null });
  });
});
