import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, fetchJson, toSearchParams } from './http';

afterEach(() => vi.unstubAllGlobals());

const stubFetch = (status: number, body: unknown) =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response(JSON.stringify(body), { status })),
  );

describe('fetchJson', () => {
  it('parses a successful body with the schema', async () => {
    stubFetch(200, { n: 1 });
    expect(await fetchJson('/api/x', z.object({ n: z.number() }))).toEqual({ n: 1 });
  });

  it('raises the api error code and message', async () => {
    stubFetch(400, { error: { code: 'INVALID_INPUT', message: 'bad type' } });
    const failure = fetchJson('/api/x', z.unknown());
    await expect(failure).rejects.toBeInstanceOf(ApiError);
    await expect(failure).rejects.toMatchObject({ code: 'INVALID_INPUT', status: 400 });
  });
});

describe('toSearchParams', () => {
  it('repeats array values and skips empty ones', () => {
    expect(toSearchParams({ type: ['a', 'b'], tag: '', limit: 25 }).toString()).toBe(
      'type=a&type=b&limit=25',
    );
  });
});
