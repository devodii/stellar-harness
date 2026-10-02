import { describe, expect, it } from 'vitest';
import { probeSep38 } from './sep38';
import { fakeFetcher, jsonRoute, readJsonFixture, tomlFixture } from './testing';

const toml = tomlFixture('testanchor.stellar.org');
const url = 'https://testanchor.stellar.org/sep38/info';

describe('probeSep38', () => {
  it('accepts an info response with assets', async () => {
    const fetch = fakeFetcher({ [url]: jsonRoute(readJsonFixture('info/testanchor-sep38.json')) });
    const outcome = await probeSep38(toml, fetch);
    expect(outcome.record).toMatchObject({ stage: 'sep38', ok: true, status: 200, error: null });
  });

  it('fails without assets', async () => {
    const outcome = await probeSep38(toml, fakeFetcher({ [url]: jsonRoute({ assets: {} }) }));
    expect(outcome.record).toMatchObject({ ok: false, error: 'missing_assets' });
  });

  it('fails on 404', async () => {
    const outcome = await probeSep38(toml, fakeFetcher({ [url]: { status: 404 } }));
    expect(outcome.record).toMatchObject({ ok: false, status: 404, error: 'http_404' });
  });

  it('skips without ANCHOR_QUOTE_SERVER', async () => {
    const outcome = await probeSep38(tomlFixture('clpx.finance'), fakeFetcher({}));
    expect(outcome.record.error).toBe('skipped: not_applicable');
    expect(outcome.endpoint).toBeNull();
  });
});
