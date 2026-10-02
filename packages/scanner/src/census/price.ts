import { getJson } from '@harness/stellar-tools/contracts';
import { z } from 'zod';
import { appError, err, ok, type Result } from '../schema';
import type { Fetcher } from './contracts/ports';

export const COINGECKO_XLM_USD_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd&include_last_updated_at=true';

export const PRICE_SOURCE = 'coingecko:simple/price';

const CoinGeckoSimplePrice = z.object({
  stellar: z.object({ usd: z.number().nonnegative(), last_updated_at: z.number().int() }),
});

export type XlmUsd = { price: number; source: string; at: string };

export const UNAVAILABLE_PRICE: XlmUsd = {
  price: 0,
  source: 'unavailable',
  at: new Date(0).toISOString(),
};

export const fetchXlmUsd = async (
  fetch: Fetcher,
  url: string = COINGECKO_XLM_USD_URL,
): Promise<Result<XlmUsd>> => {
  const response = await getJson(fetch, url, CoinGeckoSimplePrice);
  if (!response.ok) return response;
  if (!response.value) return err(appError('NOT_FOUND', `GET ${url} returned 404`));
  const { usd, last_updated_at } = response.value.stellar;
  return ok({
    price: usd,
    source: PRICE_SOURCE,
    at: new Date(last_updated_at * 1000).toISOString(),
  });
};
