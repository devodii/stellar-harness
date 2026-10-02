import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  type CacheEntry,
  cacheKey,
  DiskCache,
  isCacheableStatus,
  MemoryCache,
  NoCache,
  pickCachedHeaders,
} from './cache';

const entry: CacheEntry = {
  fetchedAt: '2026-10-02T00:00:00.000Z',
  status: 200,
  url: 'https://horizon.stellar.org/ledgers/1',
  headers: { 'content-type': 'application/json' },
  body: '{"sequence":1}',
};

describe('cacheKey', () => {
  it('namespaces by host and hashes method, url and body', () => {
    const key = cacheKey({ method: 'get', url: 'https://horizon.stellar.org/ledgers/1' });
    expect(key).toMatch(/^horizon\.stellar\.org\/[0-9a-f]{64}$/);
    expect(key).toBe(cacheKey({ method: 'GET', url: 'https://horizon.stellar.org/ledgers/1' }));
  });

  it('distinguishes bodies and methods', () => {
    const url = 'https://mainnet.sorobanrpc.com/';
    const a = cacheKey({ method: 'POST', url, body: '{"a":1}' });
    expect(a).not.toBe(cacheKey({ method: 'POST', url, body: '{"a":2}' }));
    expect(a).not.toBe(cacheKey({ method: 'GET', url }));
  });

  it('makes hosts with ports filesystem safe', () => {
    expect(cacheKey({ method: 'GET', url: 'http://localhost:8000/x' })).toMatch(
      /^localhost_8000\//,
    );
  });
});

describe('isCacheableStatus', () => {
  it('caches success and stable not-found responses only', () => {
    expect([200, 204, 404, 410].every(isCacheableStatus)).toBe(true);
    expect([301, 400, 401, 403, 408, 429, 500, 503].some(isCacheableStatus)).toBe(false);
  });
});

describe('pickCachedHeaders', () => {
  it('keeps only the allowlisted headers', () => {
    const headers = new Headers({
      'content-type': 'text/plain',
      'access-control-allow-origin': '*',
      'set-cookie': 'x=1',
    });
    expect(pickCachedHeaders(headers)).toEqual({
      'content-type': 'text/plain',
      'access-control-allow-origin': '*',
    });
  });
});

describe('caches', () => {
  it('round trips in memory', async () => {
    const cache = new MemoryCache();
    await cache.set('k', entry);
    expect(await cache.get('k')).toEqual(entry);
    expect(await cache.get('missing')).toBeNull();
  });

  it('never stores with NoCache', async () => {
    const cache = new NoCache();
    await cache.set();
    expect(await cache.get()).toBeNull();
  });

  it('stores entries under data/cache/<host>/<hash>.json on disk', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'harness-cache-'));
    const cache = new DiskCache(dataDir);
    const key = cacheKey({ method: 'GET', url: entry.url });
    await cache.set(key, entry);
    const path = join(dataDir, 'cache', `${key}.json`);
    expect(JSON.parse(await readFile(path, 'utf8'))).toEqual(entry);
    expect(await cache.get(key)).toEqual(entry);
  });

  it('treats a missing or corrupt disk entry as a miss', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'harness-cache-'));
    const cache = new DiskCache(dataDir);
    expect(await cache.get('h/none')).toBeNull();
    await cache.set('h/bad', entry);
    await writeFile(cache.pathFor('h/bad'), '{not json');
    expect(await cache.get('h/bad')).toBeNull();
  });
});
