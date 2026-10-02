import { fakeFetcher } from '@harness/stellar-tools/contracts/testing';
import { describe, expect, it } from 'vitest';
import projectsFixture from './__fixtures__/stellarlight-projects-scf.json';
import reposFixture from './__fixtures__/stellarlight-repos.json';
import {
  applyScf,
  buildScfIndex,
  fetchScfProjects,
  fetchStellarlightRepos,
  StellarlightProject,
  StellarlightRepo,
  scfTags,
} from './scf';
import type { ContractRow } from './schemas';

const BASE = 'https://stellarlight.xyz';
const projectsUrl = (offset: number) =>
  `${BASE}/api/projects/search?scfAwarded=1&limit=50&offset=${offset}`;
const reposUrl = (offset: number) =>
  `${BASE}/api/repos/search?minScore=0&limit=100&offset=${offset}`;

const projects = projectsFixture.projects.map((project) => StellarlightProject.parse(project));
const repos = reposFixture.repos.map((repo) => StellarlightRepo.parse(repo));

const REFLECTOR = 'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN';
const SOROSWAP_REPO_ID = 'CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2';
const TANSU = 'CDXINK2T3P46M4LWK35FVIXXHJ2XHAS4FOVCGVPJ63YV5OVTM24IY5BI';

describe('fetchScfProjects', () => {
  it('pages until offset plus returned reaches the total', async () => {
    const [a, b] = [projectsFixture.projects.slice(0, 3), projectsFixture.projects.slice(3)];
    const meta = (returned: number) => ({ counts: { returned, total: 5 } });
    const fetch = fakeFetcher({
      [projectsUrl(0)]: { body: { meta: meta(a.length), projects: a } },
      [projectsUrl(3)]: { body: { meta: meta(b.length), projects: b } },
    });
    const result = await fetchScfProjects(fetch, `${BASE}/`);
    expect(result).toMatchObject({ pages: 2, invalid: 0, gap: null });
    expect(result.rows.map((row) => row.slug)).toEqual(
      projectsFixture.projects.map((project) => project.slug),
    );
  });

  it('records a gap when a page fails', async () => {
    const result = await fetchScfProjects(
      fakeFetcher({ [projectsUrl(0)]: { status: 500, body: {} } }),
      BASE,
    );
    expect(result.gap?.code).toBe('UPSTREAM_FAILED');
  });
});

describe('fetchStellarlightRepos', () => {
  it('reads a single complete page', async () => {
    const result = await fetchStellarlightRepos(
      fakeFetcher({ [reposUrl(0)]: { body: reposFixture } }),
      BASE,
    );
    expect(result.rows).toHaveLength(reposFixture.repos.length);
    expect(result.pages).toBe(1);
  });
});

describe('buildScfIndex', () => {
  const index = buildScfIndex(projects, repos);

  it('takes on-chain contracts from awarded projects with their latest round', () => {
    expect(index.byContract.get(REFLECTOR)).toEqual({
      slug: 'reflector',
      name: 'Reflector',
      round: 29,
    });
  });

  it('adds verified mainnet contract ids from repos to their project', () => {
    expect(index.byContract.get(SOROSWAP_REPO_ID)?.slug).toBe('soroswap');
  });

  it('creates a project from an awarded repo whose project page was not fetched', () => {
    expect(index.byContract.get(TANSU)).toEqual({ slug: 'tansu', name: 'Tansu', round: null });
  });

  it('keeps an awarded project with no numbered round as round null', () => {
    const blend = index.projects.find((project) => project.slug === 'blend');
    expect(blend?.round).toBeNull();
    expect(blend?.contracts.length).toBeGreaterThan(0);
  });

  it('drops projects without contracts', () => {
    expect(index.projects.find((project) => project.slug === 'lobstr')).toBeUndefined();
  });
});

describe('applyScf and scfTags', () => {
  it('tags a funded contract and leaves others untagged', () => {
    const index = buildScfIndex(projects, repos);
    const funded = { contract: REFLECTOR, scf: null } as ContractRow;
    const unfunded = { contract: 'CUNKNOWN', scf: null } as ContractRow;
    const [tagged, untagged] = applyScf([funded, unfunded], index);
    expect(scfTags(tagged?.scf ?? null)).toEqual(['scf_funded', 'scf:reflector', 'scf_round_29']);
    expect(scfTags(untagged?.scf ?? null)).toEqual([]);
  });
});
