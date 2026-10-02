import { describe, expect, it } from 'vitest';
import { appError } from '../../schema';
import { probeSep31 } from './sep31';
import { fakeFetcher, jsonRoute, readJsonFixture, tomlFixture } from './testing';

const toml = tomlFixture('clpx.finance');
const url = 'https://kbtrading.org/sep31/info';

describe('probeSep31', () => {
  it('accepts an info response with receive assets', async () => {
    const fetch = fakeFetcher({ [url]: jsonRoute(readJsonFixture('info/kbtrading-sep31.json')) });
    const outcome = await probeSep31(toml, fetch);
    expect(outcome.record).toMatchObject({ stage: 'sep31', ok: true, status: 200 });
    expect(outcome.endpoint?.url).toBe(url);
  });

  it('fails without receive', async () => {
    const outcome = await probeSep31(toml, fakeFetcher({ [url]: jsonRoute({ send: {} }) }));
    expect(outcome.record.error).toBe('missing_receive');
  });

  it('fails on timeouts', async () => {
    const fetch = fakeFetcher({ [url]: appError('UPSTREAM_TIMEOUT', 'timed out') });
    const outcome = await probeSep31(toml, fetch);
    expect(outcome.record).toMatchObject({ ok: false, status: null });
  });

  it('skips without DIRECT_PAYMENT_SERVER', async () => {
    const outcome = await probeSep31(tomlFixture('anclap.com'), fakeFetcher({}));
    expect(outcome.record.error).toBe('skipped: not_applicable');
  });
});
