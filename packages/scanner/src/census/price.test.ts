import { describe, expect, it } from 'vitest';
import { fakeFetcher } from '../stellar/contracts/fakes';
import coingecko from './__fixtures__/coingecko-xlm-usd.json';
import { COINGECKO_XLM_USD_URL, fetchXlmUsd } from './price';

describe('fetchXlmUsd', () => {
  it('reads the recorded coingecko price with its timestamp', async () => {
    const fetch = fakeFetcher({ [COINGECKO_XLM_USD_URL]: { body: coingecko } });
    expect(await fetchXlmUsd(fetch)).toEqual({
      ok: true,
      value: {
        price: 0.219068,
        source: 'coingecko:simple/price',
        at: new Date(coingecko.stellar.last_updated_at * 1000).toISOString(),
      },
    });
  });

  it('fails when the price api is unavailable', async () => {
    const result = await fetchXlmUsd(fakeFetcher({}));
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });
});
