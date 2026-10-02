import { NETWORK_PROFILES } from '@harness/schema';
import { loadNetworkConfig } from '@harness/stellar-tools';
import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { createAgentContext, createLiveClients } from './context';
import { createAgentTools } from './tools';

const config = loadNetworkConfig({
  RPC_URL: 'https://rpc.test',
  HORIZON_URL: 'https://horizon.test',
  STELLAR_EXPERT_URL: 'https://expert.test/explorer/public',
  STELLARLIGHT_URL: 'https://light.test',
});

const FAILED_TX = {
  hash: '4f5718e4d01e95aee1fb4f412381286726670090366cf7a61ccbeb9ea704c6c1',
  envelopeXdr:
    'AAAAAgAAAAAlaWCz7QZvpmmCNCM7xy9VBEAP6vyRNZsk2UKgEZw/sAAAAGQDhEYrAAW6VgAAAAEAAAAAAAAAAAAAAABqvs+TAAAAAAAAAAEAAAAAAAAADwAAAAB7DkZXuUFo3Alda0umJUQlgdu5l3KAo/QoMRm9sn417gAAAAAAAAABEZw/sAAAAECDK4HUU8dxKf/v2a2LctohOgrx81kc75BMc2CGII2KGEQAvpkGqM2+thgIXMEl7V7m66vFZsWXl/qu9S2wrA8P',
  resultXdr: 'AAAAAAAAAGT/////AAAAAQAAAAAAAAAP/////AAAAAA=',
};

const rpcResult = (method: string): unknown => {
  if (method === 'getLatestLedger') {
    return { id: 'abc', protocolVersion: 23, sequence: 64_720_900 };
  }
  if (method === 'getTransaction') {
    return {
      status: 'FAILED',
      ledger: 64_720_813,
      createdAt: '1790889847',
      envelopeXdr: FAILED_TX.envelopeXdr,
      resultXdr: FAILED_TX.resultXdr,
    };
  }
  return null;
};

const setup = (options: { snapshotLedger?: number } = {}) => {
  const calls: string[] = [];
  const fetch: typeof globalThis.fetch = async (input, init) => {
    const url = String(input);
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
    calls.push(body ? `${url}#${body.method}` : url);
    const payload = url.startsWith('https://rpc.test')
      ? { jsonrpc: '2.0', id: 1, result: rpcResult(body.method) }
      : { projects: [], repos: [] };
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  };
  const clients = createLiveClients(config, { fetch, log: () => {} });
  const ctx = createAgentContext({
    clients,
    storage: new MemoryStorage(),
    ...options,
  });
  return { ctx, calls };
};

const options = { toolCallId: 'call_1', messages: [], context: {} };

describe('createAgentContext', () => {
  it('reads the latest ledger from RPC on every call', async () => {
    const { ctx, calls } = setup();
    expect(await ctx.latestLedger()).toBe(64_720_900);
    expect(await ctx.latestLedger()).toBe(64_720_900);
    expect(calls).toEqual(['https://rpc.test#getLatestLedger', 'https://rpc.test#getLatestLedger']);
  });

  it('pins the ledger to the snapshot when one is given', async () => {
    const { ctx, calls } = setup({ snapshotLedger: 59_000_000 });
    expect(await ctx.latestLedger()).toBe(59_000_000);
    expect(calls).toEqual([]);
  });

  it('wires network urls and the default ledger close time', () => {
    const { ctx } = setup();
    expect(ctx).toMatchObject({
      rpcUrl: 'https://rpc.test',
      horizonUrl: 'https://horizon.test',
      stellarExpertUrl: 'https://expert.test/explorer/public',
      ledgerCloseSeconds: 5,
    });
  });

  it('resolves stellarlight paths against the configured host', async () => {
    const { ctx, calls } = setup();
    expect(await ctx.stellarlight.get('/api/projects/search?q=x')).toEqual({
      projects: [],
      repos: [],
    });
    expect(calls).toEqual(['https://light.test/api/projects/search?q=x']);
  });

  it('explains a failure by hash through the real transaction reader and decoders', async () => {
    const { ctx } = setup();
    const tools = createAgentTools(ctx);
    const result = await tools.explainFailure.execute({ hash: FAILED_TX.hash }, options);
    expect(result).toMatchObject({
      ok: true,
      data: { codes: { tx: 'tx_failed', ops: ['op_no_trust'] } },
    });
  });

  it('decodes a transaction with the real envelope decoder', async () => {
    const { ctx } = setup();
    const result = await createAgentTools(ctx).getTransaction.execute(
      { hash: FAILED_TX.hash },
      options,
    );
    expect(result).toMatchObject({
      ok: true,
      data: {
        source: 'GASWSYFT5UDG7JTJQI2CGO6HF5KQIQAP5L6JCNM3ETMUFIARTQ73ATMB',
        operations: [{ type: 'claim_claimable_balance' }],
        resultCodes: { tx: 'tx_failed', ops: ['op_no_trust'] },
        feeBump: null,
      },
    });
  });
});

describe('createAgentContext on testnet', () => {
  const testnet = () => {
    const calls: string[] = [];
    const fetch: typeof globalThis.fetch = async (input, init) => {
      const url = String(input);
      const body = typeof init?.body === 'string' ? JSON.parse(init.body) : null;
      calls.push(body ? `${url}#${body.method}` : url);
      return new Response(
        JSON.stringify({ jsonrpc: '2.0', id: 1, result: rpcResult(body?.method ?? '') }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const clients = createLiveClients(loadNetworkConfig({}, 'testnet'), { fetch, log: () => {} });
    const ctx = createAgentContext({
      clients,
      storage: new MemoryStorage(),
    });
    return { ctx, calls };
  };

  it('takes urls, passphrase and ecosystem availability from the testnet config', () => {
    const { ctx } = testnet();
    expect(ctx).toMatchObject({
      network: 'testnet',
      networkPassphrase: NETWORK_PROFILES.testnet.passphrase,
      ecosystemDirectory: false,
      rpcUrl: NETWORK_PROFILES.testnet.rpcUrl,
      horizonUrl: NETWORK_PROFILES.testnet.horizonUrl,
      stellarExpertUrl: NETWORK_PROFILES.testnet.stellarExpertUrl,
    });
  });

  it('reads the latest ledger from testnet RPC', async () => {
    const { ctx, calls } = testnet();
    await ctx.latestLedger();
    expect(calls).toEqual([`${NETWORK_PROFILES.testnet.rpcUrl}#getLatestLedger`]);
  });

  it('answers ecosystem search with a mainnet-only error and no request', async () => {
    const { ctx, calls } = testnet();
    const result = await createAgentTools(ctx).searchEcosystem.execute({ query: 'x' }, options);
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(calls).toEqual([]);
  });

  it('keeps mainnet settings for a mainnet config', () => {
    const { ctx } = setup();
    expect(ctx).toMatchObject({
      network: 'mainnet',
      networkPassphrase: NETWORK_PROFILES.mainnet.passphrase,
      ecosystemDirectory: true,
    });
  });
});

describe('createLiveClients', () => {
  it('never serves a repeated request from a cache', async () => {
    const { ctx, calls } = setup();
    await ctx.stellarlight.get('/api/repos/search?q=x');
    await ctx.stellarlight.get('/api/repos/search?q=x');
    expect(calls).toHaveLength(2);
  });
});
