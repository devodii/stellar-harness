import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { MemoryCache } from './cache';
import { failureKindOf } from './errors';
import { createHttp, type HttpGap, type HttpOptions, USER_AGENT } from './http';
import { memoryLogger, silentLogger } from './log';
import { HostLimiter } from './semaphore';

type Reply = Response | Error | ((input: string, init: RequestInit) => Response);

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const mockFetch = (replies: Reply[]) => {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  const fetch = async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = input.toString();
    calls.push({ url, init });
    const reply = replies.shift();
    if (!reply) throw new Error(`unexpected fetch ${url}`);
    if (reply instanceof Error) throw reply;
    return typeof reply === 'function' ? reply(url, init) : reply;
  };
  return { fetch: fetch as typeof globalThis.fetch, calls };
};

const setup = (replies: Reply[], extra: Partial<HttpOptions> = {}) => {
  const mock = mockFetch(replies);
  const sleeps: number[] = [];
  const gaps: HttpGap[] = [];
  const http = createHttp({
    fetch: mock.fetch,
    log: silentLogger,
    sleep: async (ms) => void sleeps.push(ms),
    random: () => 0.5,
    onGap: (gap) => void gaps.push(gap),
    ...extra,
  });
  return { http, calls: mock.calls, sleeps, gaps };
};

const Ledger = z.object({ sequence: z.number() });
const URL_A = 'https://horizon.stellar.org/ledgers/1';

const networkError = (code: string) =>
  new TypeError('fetch failed', { cause: Object.assign(new Error(code), { code }) });

describe('createHttp', () => {
  it('parses json and sends the honest user agent', async () => {
    const { http, calls } = setup([json({ sequence: 1 })]);
    expect(await http.getJson(URL_A, Ledger)).toEqual({ ok: true, value: { sequence: 1 } });
    const headers = calls[0]?.init.headers as Record<string, string>;
    expect(headers['user-agent']).toBe(USER_AGENT);
    expect(calls[0]?.init.redirect).toBe('manual');
  });

  it('serves a warm cache with zero network calls', async () => {
    const cache = new MemoryCache();
    const cold = setup([json({ sequence: 1 })], { cache });
    await cold.http.getJson(URL_A, Ledger);
    const warm = setup([], { cache });
    const result = await warm.http.request({ url: URL_A });
    expect(result.ok && result.value.cached).toBe(true);
    expect(warm.calls).toHaveLength(0);
    expect(warm.http.stats.totals()).toMatchObject({ requests: 1, cacheHits: 1, network: 0 });
  });

  it('bypasses the cache when asked', async () => {
    const cache = new MemoryCache();
    const { http, calls } = setup([json({ sequence: 1 }), json({ sequence: 2 })], { cache });
    await http.getJson(URL_A, Ledger, { cache: false });
    expect(cache.entries.size).toBe(0);
    await http.getJson(URL_A, Ledger);
    expect(calls).toHaveLength(2);
  });

  it('caches 404 but not 429, 5xx or 403', async () => {
    const cache = new MemoryCache();
    const { http } = setup([json({}, 404), json({}, 403), json({}, 500), json({ sequence: 3 })], {
      cache,
    });
    await http.request({ url: 'https://h.example/missing' });
    await http.request({ url: 'https://h.example/forbidden' });
    await http.request({ url: 'https://h.example/flaky' });
    expect([...cache.entries.values()].map((entry) => entry.status)).toEqual([404, 200]);
  });

  it('does not cache when the caller predicate refuses', async () => {
    const cache = new MemoryCache();
    const { http } = setup([json({ error: 'x' })], { cache });
    await http.request({ url: URL_A, cacheable: (response) => !response.body.includes('error') });
    expect(cache.entries.size).toBe(0);
  });

  it('stores only allowlisted headers', async () => {
    const cache = new MemoryCache();
    const { http } = setup(
      [json({ sequence: 1 }, 200, { 'access-control-allow-origin': '*', 'set-cookie': 'a=b' })],
      { cache },
    );
    const result = await http.request({ url: URL_A });
    expect(result.ok && result.value.headers).toEqual({
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
    });
  });

  it('retries 429 and honors Retry-After', async () => {
    const { http, sleeps } = setup([
      json({}, 429, { 'retry-after': '7' }),
      json({}, 503),
      json({ sequence: 1 }),
    ]);
    const result = await http.getJson(URL_A, Ledger);
    expect(result.ok).toBe(true);
    expect(sleeps).toEqual([7000, 500]);
    expect(http.stats.totals()).toMatchObject({ retries: 2, network: 3 });
  });

  it('gives up after six attempts and reports a gap', async () => {
    const replies = Array.from({ length: 6 }, () => json({}, 502));
    const { http, gaps, calls } = setup(replies);
    const result = await http.getJson(URL_A, Ledger);
    expect(calls).toHaveLength(6);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.meta).toMatchObject({ gap: true, status: 502 });
    expect(gaps).toEqual([
      expect.objectContaining({ host: 'horizon.stellar.org', attempts: 6, status: 502 }),
    ]);
    expect(http.stats.totals().gaps).toBe(1);
  });

  it('retries network resets then reports a gap', async () => {
    const { http, gaps } = setup([networkError('ECONNRESET'), networkError('ECONNRESET')], {
      retry: { maxAttempts: 2 },
    });
    const result = await http.request({ url: URL_A });
    expect(result.ok).toBe(false);
    expect(gaps).toHaveLength(1);
  });

  it('fails fast on dns errors for unknown hosts', async () => {
    const { http, calls } = setup([networkError('ENOTFOUND')]);
    const result = await http.request({ url: 'https://gone.example/.well-known/stellar.toml' });
    expect(calls).toHaveLength(1);
    expect(!result.ok && failureKindOf(result.error)).toBe('dns');
  });

  it('retries dns errors for reliable hosts', async () => {
    const { http, calls } = setup([networkError('ENOTFOUND'), json({ ok: true })], {
      reliableHosts: new Set([new URL(URL_A).host]),
    });
    const result = await http.request({ url: URL_A });
    expect(result.ok).toBe(true);
    expect(calls).toHaveLength(2);
  });

  it('fails fast and distinguishably on tls errors', async () => {
    const { http, calls, gaps } = setup([networkError('CERT_HAS_EXPIRED')]);
    const result = await http.request({ url: 'https://anchor.example/.well-known/stellar.toml' });
    expect(calls).toHaveLength(1);
    expect(gaps).toHaveLength(0);
    expect(!result.ok && failureKindOf(result.error)).toBe('tls');
  });

  it('reports timeouts with UPSTREAM_TIMEOUT', async () => {
    const timeout = new DOMException('timed out', 'TimeoutError');
    const { http } = setup([timeout], { retry: { maxAttempts: 1 } });
    const result = await http.request({ url: URL_A, timeoutMs: 10 });
    expect(!result.ok && result.error.code).toBe('UPSTREAM_TIMEOUT');
  });

  it('follows up to three redirects and exposes the final url', async () => {
    const redirect = (location: string) =>
      new Response(null, { status: 301, headers: { location } });
    const { http, calls } = setup([
      redirect('https://www.anchor.example/.well-known/stellar.toml'),
      redirect('/toml'),
      new Response('VERSION="2.0.0"', { status: 200 }),
    ]);
    const result = await http.request({ url: 'https://anchor.example/.well-known/stellar.toml' });
    expect(calls.map((call) => call.url)).toEqual([
      'https://anchor.example/.well-known/stellar.toml',
      'https://www.anchor.example/.well-known/stellar.toml',
      'https://www.anchor.example/toml',
    ]);
    expect(result.ok && result.value).toMatchObject({
      finalUrl: 'https://www.anchor.example/toml',
      redirects: 2,
      body: 'VERSION="2.0.0"',
    });
  });

  it('stops at the redirect cap and returns the redirect response', async () => {
    const loop = () => new Response(null, { status: 302, headers: { location: '/again' } });
    const { http } = setup([loop(), loop()]);
    const result = await http.request({ url: 'https://a.example/x', maxRedirects: 1 });
    expect(result.ok && result.value).toMatchObject({ status: 302, redirects: 1 });
  });

  it('turns non-2xx json into typed errors', async () => {
    const { http } = setup([json({ status: 404 }, 404)]);
    const result = await http.getJson(URL_A, Ledger);
    expect(!result.ok && result.error.code).toBe('NOT_FOUND');
  });

  it('reports schema mismatches without throwing', async () => {
    const { http } = setup([json({ sequence: 'one' })]);
    const result = await http.getJson(URL_A, Ledger);
    expect(!result.ok && failureKindOf(result.error)).toBe('schema');
  });

  it('posts json bodies', async () => {
    const { http, calls } = setup([json({ sequence: 9 })]);
    await http.postJson('https://mainnet.sorobanrpc.com', { a: 1 }, Ledger);
    expect(calls[0]?.init).toMatchObject({ method: 'POST', body: '{"a":1}' });
  });

  it('returns text and transforms bodies before caching', async () => {
    const cache = new MemoryCache();
    const { http } = setup([new Response('hello world')], { cache });
    const result = await http.getText(URL_A, { transformBody: (body) => body.toUpperCase() });
    expect(result).toEqual({ ok: true, value: 'HELLO WORLD' });
    expect([...cache.entries.values()][0]?.body).toBe('HELLO WORLD');
  });

  it('logs one json line per network attempt and cache hit', async () => {
    const log = memoryLogger();
    const cache = new MemoryCache();
    const { http } = setup([json({ sequence: 1 })], { log, cache });
    await http.request({ url: `${URL_A}?x=1` });
    await http.request({ url: `${URL_A}?x=1` });
    expect(log.lines).toEqual([
      expect.objectContaining({
        host: 'horizon.stellar.org',
        path: '/ledgers/1?x=1',
        status: 200,
        cached: false,
      }),
      expect.objectContaining({ status: 200, cached: true, ms: 0 }),
    ]);
  });

  it('respects the per-host limiter', async () => {
    let active = 0;
    let peak = 0;
    const slow = () => {
      active += 1;
      peak = Math.max(peak, active);
      return new Promise<Response>((resolve) =>
        setTimeout(() => {
          active -= 1;
          resolve(json({ sequence: 1 }));
        }, 2),
      );
    };
    const fetch = (() => slow()) as unknown as typeof globalThis.fetch;
    const http = createHttp({
      fetch,
      log: silentLogger,
      limiter: new HostLimiter({ limits: { 'horizon.stellar.org': 2 } }),
    });
    await Promise.all(
      Array.from({ length: 8 }, (_, i) => http.request({ url: `${URL_A}?i=${i}` })),
    );
    expect(peak).toBe(2);
  });
});
