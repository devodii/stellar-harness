import { describe, expect, it } from 'vitest';
import { invokeTool } from '../tool';
import projects from './__fixtures__/stellarlight-projects.json';
import repos from './__fixtures__/stellarlight-repos.json';
import { searchEcosystem } from './search-ecosystem';

const ctx = {
  stellarlight: {
    get: async (path: string) => (path.startsWith('/api/projects') ? projects : repos),
  },
};

describe('searchEcosystem', () => {
  it('returns compact projects and repos from stellarlight', async () => {
    const result = await invokeTool(searchEcosystem, { query: 'soroswap' }, ctx);
    if (!result.ok) throw new Error(result.error.message);
    const soroswap = result.data.projects.find((project) => project.slug === 'soroswap');
    expect(soroswap).toMatchObject({ scfAwarded: true, scfRound: 21 });
    expect(soroswap?.contracts[0]).toMatch(/^C[A-Z2-7]{55}$/);
    expect(result.data.repos.find((repo) => repo.name === 'soroswap/core')?.mainnetContractId).toBe(
      'CA4HEQTL2WPEUYKYKCDOHCDNIV4QHNJ7EL4J4NQ6VADP7SYHVRYZ7AW2',
    );
  });

  it('surfaces an unexpected upstream shape as an error envelope', async () => {
    const result = await invokeTool(
      searchEcosystem,
      { query: 'x' },
      { stellarlight: { get: async () => ({ nope: true }) } },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_FAILED' } });
  });
});
