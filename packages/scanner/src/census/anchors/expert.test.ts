import { describe, expect, it } from 'vitest';
import { fetchTopAssets, parseAssetId, topAssetsUrl } from './expert';
import { fakeFetcher, jsonRoute, readJsonFixture } from './testing';

const BASE = 'https://api.stellar.expert/explorer/public';

describe('parseAssetId', () => {
  it('splits code and issuer', () => {
    expect(parseAssetId('USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN-1')).toEqual(
      { code: 'USDC', issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN' },
    );
    expect(parseAssetId('XLM')).toBeNull();
  });
});

describe('fetchTopAssets', () => {
  it('reads assets sorted by trustlines and keeps issuers without a domain', async () => {
    const fetch = fakeFetcher({
      [topAssetsUrl(BASE, 200)]: jsonRoute(readJsonFixture('expert/assets-trustlines.json')),
    });
    const result = await fetchTopAssets(fetch, BASE);
    if (!result.ok) throw new Error('expected assets');
    expect(result.value.map((a) => [a.code, a.domain])).toEqual([
      ['USDC', 'centre.io'],
      ['GTN', null],
      ['ARST', 'pubnet-sep.latamex.com'],
      ['ZARZ', 'zeam.money'],
      ['XRP', 'fchain.io'],
    ]);
    expect(fetch.calls[0]?.url).toBe(
      'https://api.stellar.expert/explorer/public/asset?limit=200&order=desc&sort=trustlines',
    );
  });
});
