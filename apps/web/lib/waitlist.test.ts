import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestPilot, waitingLabel } from './waitlist';

const respond = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status }));

afterEach(() => vi.unstubAllGlobals());

describe('requestPilot', () => {
  it('returns the waiting count', async () => {
    vi.stubGlobal('fetch', respond(200, { count: 3 }));
    expect(await requestPilot({ email: 'ops@example.org' })).toEqual({
      ok: true,
      value: { count: 3 },
    });
  });

  it('keeps the api error code and message', async () => {
    vi.stubGlobal('fetch', respond(429, { error: { code: 'RATE_LIMITED', message: 'Slow down' } }));
    const result = await requestPilot({ email: 'ops@example.org' });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', message: 'Slow down' },
    });
  });

  it('reports a network failure as an upstream error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    );
    const result = await requestPilot({ email: 'ops@example.org' });
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_FAILED' } });
  });
});

describe('waitingLabel', () => {
  it('counts organisations', () => {
    expect(waitingLabel(1)).toBe('request received · 1 organisation waiting');
    expect(waitingLabel(240)).toBe('request received · 240 organisations waiting');
  });
});
