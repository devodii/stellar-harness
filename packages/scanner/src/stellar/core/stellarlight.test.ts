import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/stellarlight.json';
import {
  createStellarlightClient,
  isLastPage,
  projectContractIds,
  repoMainnetContractId,
  type StellarlightProject,
} from './stellarlight';
import { jsonResponse, mockHttp } from './test-utils';

const BASE = 'https://stellarlight.xyz';

const setup = (route: (url: URL) => unknown) => {
  const mock = mockHttp((url) => jsonResponse(route(new URL(url))));
  return { ...mock, client: createStellarlightClient({ http: mock.http, url: `${BASE}/` }) };
};

describe('stellarlight client', () => {
  it('lists anchor partners with the exact field names', async () => {
    const { client, calls } = setup(() => fixtures.partners);
    const result = await client.partners({ type: 'anchor' });
    expect(calls[0]?.url).toBe(`${BASE}/api/partners?type=anchor&all=1&limit=100`);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.meta.counts?.total).toBe(24);
    expect(result.value.rows[0]).toMatchObject({
      slug: 'etherfuse',
      websiteUrl: 'https://etherfuse.com',
      tomlSourceUrl: 'https://etherfuse.com/.well-known/stellar.toml',
      rampTypes: ['on-ramp', 'off-ramp'],
      country: 'Mexico',
      regions: ['latam'],
    });
  });

  it('handles an empty partner type', async () => {
    const { client } = setup(() => fixtures.partnersEmpty);
    const result = await client.partners({ type: 'on-off-ramp' });
    expect(result.ok && result.value.rows).toEqual([]);
  });

  it('searches scf awarded projects and exposes on-chain contract ids', async () => {
    const { client, calls } = setup(() => fixtures.projects);
    const result = await client.projectsSearch({ scfAwarded: true, limit: 50, offset: 0 });
    expect(calls[0]?.url).toBe(`${BASE}/api/projects/search?limit=50&offset=0&scfAwarded=1`);
    if (!result.ok) throw new Error(result.error.message);
    const [plain, onchain] = result.value.rows as [StellarlightProject, StellarlightProject];
    expect(plain.scfAwardedRounds).toEqual([2, 17, 22]);
    expect(projectContractIds(plain)).toEqual([]);
    expect(projectContractIds(onchain)).toEqual([
      'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
      'CBLLEW7HD2RWATVSMLAGWM4G3WCHSHDJ25ALP4DI6LULV5TU35N2CIZA',
    ]);
  });

  it('reads the mainnet contract id from codeVerified on repos', async () => {
    const { client, calls } = setup(() => fixtures.repos);
    const result = await client.reposSearch({ minScore: 40 });
    expect(calls[0]?.url).toBe(`${BASE}/api/repos/search?minScore=40&limit=100&offset=0`);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.rows.map(repoMainnetContractId)).toEqual([
      'CAFJZQWSED6YAWZU3GWRTOCNPPCGBN32L7QV43XX5LZLFTK6JLN34DLN',
      null,
    ]);
  });

  it('pages until offset plus returned reaches the total', async () => {
    const page = (offset: number) => ({
      ...fixtures.projects,
      meta: { counts: { returned: 2, total: 5 } },
      projects: offset >= 4 ? fixtures.projects.projects.slice(0, 1) : fixtures.projects.projects,
    });
    const { client, calls } = setup((url) => {
      const offset = Number(url.searchParams.get('offset'));
      const body = page(offset);
      return offset >= 4 ? { ...body, meta: { counts: { returned: 1, total: 5 } } } : body;
    });
    let rows = 0;
    for await (const result of client.allProjects({ scfAwarded: true, limit: 2 })) {
      if (result.ok) rows += result.value.rows.length;
    }
    expect(rows).toBe(5);
    expect(calls.map((call) => new URL(call.url).searchParams.get('offset'))).toEqual([
      '0',
      '2',
      '4',
    ]);
  });
});

describe('isLastPage', () => {
  it('falls back to a short page when total is unknown', () => {
    expect(isLastPage({ counts: { returned: 3, total: null } }, 0, 10)).toBe(true);
    expect(isLastPage({ counts: { returned: 10, total: null } }, 0, 10)).toBe(false);
    expect(isLastPage({ counts: { returned: 0 } }, 0, 10)).toBe(true);
  });
});
