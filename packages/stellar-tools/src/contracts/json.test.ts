import { appError, err } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { fakeFetcher } from './fakes';
import { getJson } from './json';

const Shape = z.object({ n: z.number() });

describe('getJson', () => {
  it('parses a 200 body with the schema', async () => {
    const fetch = fakeFetcher({ 'https://x/a': { body: { n: 1 } } });
    expect(await getJson(fetch, 'https://x/a', Shape)).toEqual({ ok: true, value: { n: 1 } });
  });

  it('maps 404 to null', async () => {
    expect(await getJson(fakeFetcher({}), 'https://x/missing', Shape)).toEqual({
      ok: true,
      value: null,
    });
  });

  it('fails on other non 2xx statuses', async () => {
    const fetch = fakeFetcher({ 'https://x/a': { status: 503, body: {} } });
    expect(await getJson(fetch, 'https://x/a', Shape)).toMatchObject({
      ok: false,
      error: { code: 'UPSTREAM_FAILED', meta: { status: 503 } },
    });
  });

  it('fails on invalid JSON and on schema mismatch', async () => {
    const fetch = fakeFetcher({
      'https://x/bad': { body: 'not json' },
      'https://x/shape': { body: { n: 'one' } },
    });
    expect((await getJson(fetch, 'https://x/bad', Shape)).ok).toBe(false);
    expect(await getJson(fetch, 'https://x/shape', Shape)).toMatchObject({
      ok: false,
      error: { meta: { path: 'n' } },
    });
  });

  it('passes transport errors through', async () => {
    const failure = err(appError('UPSTREAM_TIMEOUT', 'timeout'));
    const result = await getJson(async () => failure, 'https://x/a', Shape);
    expect(result).toBe(failure);
  });
});
