import { describe, expect, it } from 'vitest';
import { createClients, loadNetworkConfig, NoCache } from '../stellar';
import { scanPorts } from './context';
import { probeHorizon, unavailableHorizon } from './horizon';

const ACCOUNT = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const testnetClients = (horizon: () => Response) => {
  const calls: string[] = [];
  const fetch: typeof globalThis.fetch = async (input) => {
    const url = String(input);
    calls.push(url);
    if (url.startsWith('https://horizon-testnet.stellar.org')) return horizon();
    return new Response(
      JSON.stringify({ jsonrpc: '2.0', id: 1, result: { entries: [], latestLedger: 10 } }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  const clients = createClients(loadNetworkConfig({}, 'testnet'), {
    cache: new NoCache(),
    fetch,
    log: () => {},
    sleep: async () => {},
  });
  return { clients, calls };
};

const refused = (): Response => {
  throw Object.assign(new TypeError('fetch failed'), {
    cause: Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }),
  });
};

describe('probeHorizon', () => {
  it('reports an available Horizon', async () => {
    const { clients } = testnetClients(() => new Response('{}', { status: 200 }));
    expect(await probeHorizon(clients)).toEqual({ available: true });
  });

  it('reports a refused Horizon with a note after two attempts', async () => {
    const { clients, calls } = testnetClients(refused);
    const status = await probeHorizon(clients);
    expect(status.available).toBe(false);
    expect(status.available ? '' : status.note).toMatch(
      /^Horizon \(https:\/\/horizon-testnet\.stellar\.org\) was unavailable at scan start/,
    );
    expect(calls).toHaveLength(2);
  });

  it('treats a 5xx Horizon as unavailable', async () => {
    const { clients } = testnetClients(() => new Response('down', { status: 503 }));
    const status = await probeHorizon(clients);
    expect(status.available ? '' : status.note).toContain('HTTP 503');
  });
});

describe('unavailableHorizon', () => {
  it('fails every call without a request', async () => {
    const port = unavailableHorizon('down');
    expect(await port.account(ACCOUNT)).toMatchObject({ ok: false, error: { message: 'down' } });
    expect(await port.firstOperation(ACCOUNT)).toMatchObject({ ok: false });
  });
});

describe('scanPorts with Horizon unavailable', () => {
  it('reads accounts from RPC without touching Horizon', async () => {
    const { clients, calls } = testnetClients(refused);
    const ports = scanPorts(clients, { available: false, note: 'down' });
    expect(await ports.horizon.account(ACCOUNT)).toEqual({ ok: true, value: null });
    expect(await ports.horizon.firstOperation(ACCOUNT)).toMatchObject({ ok: false });
    expect(calls).toEqual(['https://soroban-testnet.stellar.org']);
  });
});
