import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Cache, createClients, DiskCache, loadNetworkConfig, NoCache } from '../stellar';
import { scanPorts, selectCache } from './context';

const memoryCache = (): Cache => {
  const entries = new Map<string, Parameters<Cache['set']>[1]>();
  return {
    get: async (key) => entries.get(key) ?? null,
    set: async (key, entry) => {
      entries.set(key, entry);
    },
  };
};

describe('selectCache', () => {
  it('uses the disk cache under the data directory by default', () => {
    const cache = selectCache({ dataDir: '/tmp/data' });
    expect(cache).toBeInstanceOf(DiskCache);
    expect((cache as DiskCache).root).toBe(join('/tmp/data', 'cache'));
  });

  it('uses an injected cache', () => {
    const injected = memoryCache();
    expect(selectCache({ dataDir: '/tmp/data', cache: injected })).toBe(injected);
  });

  it('bypasses every cache with noCache', () => {
    const cache = selectCache({ dataDir: '/tmp/data', cache: memoryCache(), noCache: true });
    expect(cache).toBeInstanceOf(NoCache);
  });
});

describe('scanPorts', () => {
  it('reads accounts from RPC when Horizon refuses connections', async () => {
    const calls: string[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const url = String(input);
      calls.push(url);
      if (url.startsWith('https://horizon.stellar.org')) {
        throw Object.assign(new TypeError('fetch failed'), {
          cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
        });
      }
      const body = JSON.parse(String(init?.body));
      expect(body.method).toBe('getLedgerEntries');
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: { entries: [], latestLedger: 10 } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const clients = createClients(loadNetworkConfig({}), {
      cache: new NoCache(),
      fetch,
      log: () => {},
      sleep: async () => {},
    });
    const result = await scanPorts(clients).horizon.account(
      'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    );
    expect(result).toEqual({ ok: true, value: null });
    expect(calls.at(-1)).toBe('https://mainnet.sorobanrpc.com');
  });
});
