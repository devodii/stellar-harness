import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/expert.json';
import { createExpertClient, type ExpertContract, parseExpertAsset } from './expert';
import { jsonResponse, mockHttp } from './test-utils';

const EXPERT = 'https://api.stellar.expert/explorer/public';

const setup = (route: (url: URL) => Response | null) => {
  const mock = mockHttp((url) => route(new URL(url)));
  return { ...mock, expert: createExpertClient({ http: mock.http, url: EXPERT }) };
};

describe('stellar.expert client', () => {
  it('follows relative _links.next until a page is empty', async () => {
    const empty = { _links: {}, _embedded: { records: [] } };
    const { expert, calls } = setup((url) =>
      jsonResponse(url.searchParams.get('cursor') ? empty : fixtures.contracts),
    );
    const seen: ExpertContract[] = [];
    for await (const page of expert.contracts({ limit: 3 })) {
      if (page.ok) seen.push(...page.value.records);
    }
    expect(seen.map((record) => record.contract)).toEqual([
      'CDZZZADKQPBUEBSTLON3M666R2Z73EMERP5KUBY6YETA76XZKSLSFDD4',
      'CDZZYSTV47GEQMBN6CLNMEN63UZFP3B3WSPBXFZRZT67WKWV6JPZZ7PX',
      'CDZZXTD4V2HR6GLMEJ5Y35254LTP2FOU6H2YW67GN3Y6G7KO5M6V5PBL',
    ]);
    expect(seen[0]).toMatchObject({
      wasm: expect.stringMatching(/^[0-9a-f]{64}$/),
      invocations: 0,
    });
    expect(calls.map((call) => call.url)).toEqual([
      `${EXPERT}/contract?order=desc&limit=3`,
      'https://api.stellar.expert/explorer/public/contract?order=desc&limit=3&cursor=CDZZXTD4V2HR6GLMEJ5Y35254LTP2FOU6H2YW67GN3Y6G7KO5M6V5PBL',
    ]);
  });

  it('reads contract detail with validation status', async () => {
    const { expert } = setup((url) =>
      url.pathname.endsWith('MI75')
        ? jsonResponse(fixtures.contractSac)
        : jsonResponse(fixtures.contract),
    );
    const wasm = await expert.contract('CDZZZADKQPBUEBSTLON3M666R2Z73EMERP5KUBY6YETA76XZKSLSFDD4');
    expect(wasm.ok && wasm.value?.validation?.status).toBe('unverified');
    const sac = await expert.contract('CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75');
    expect(sac.ok && sac.value?.invocations).toBe(399827);
    expect(sac.ok && sac.value?.validation).toBeUndefined();
  });

  it('returns null for an unknown or invalid contract', async () => {
    const { expert } = setup(() => jsonResponse(fixtures.contractInvalid, 400));
    expect(await expert.contract('CBAD')).toEqual({ ok: true, value: null });
  });

  it('lists assets with a supported sort', async () => {
    const { expert, calls } = setup(() => jsonResponse(fixtures.assets));
    const result = await expert.assets({ sort: 'trustlines', limit: 5 });
    expect(calls[0]?.url).toBe(`${EXPERT}/asset?sort=trustlines&order=desc&limit=5`);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.records.map((asset) => asset.trustlines?.total)).toEqual([
      11017423, 2463022, 192063,
    ]);
    expect(result.value.records[1]?.domain).toBe('centre.io');
    expect(result.value.next).toContain('cursor=5');
  });
});

describe('parseExpertAsset', () => {
  it('splits classic assets and recognises XLM', () => {
    expect(
      parseExpertAsset('USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN-1'),
    ).toEqual({
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    });
    expect(parseExpertAsset('XLM')).toEqual({ code: 'XLM', issuer: null });
    expect(parseExpertAsset('CBIJBDNZNF4X35BJ4FFZ')).toBeNull();
  });
});
