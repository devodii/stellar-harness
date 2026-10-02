import { Keypair, StrKey, xdr } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/rpc.json';
import { MemoryCache } from './cache';
import { createRpcClient, stripTransactionMeta } from './rpc';
import { jsonResponse, mockHttp, rpcMethodOf } from './test-utils';

const RPC_URL = 'https://mainnet.sorobanrpc.com';

const byMethod = (responses: Record<string, unknown>) =>
  mockHttp((_url, init) => {
    const method = rpcMethodOf(init);
    return method && method in responses ? jsonResponse(responses[method]) : null;
  });

const setup = (responses: Record<string, unknown>) => {
  const mock = byMethod(responses);
  return { ...mock, rpc: createRpcClient({ http: mock.http, url: RPC_URL }) };
};

const accountKey = (fill: number) =>
  xdr.LedgerKey.account(
    new xdr.LedgerKeyAccount({
      accountId: Keypair.fromPublicKey(
        StrKey.encodeEd25519PublicKey(new Uint8Array(32).fill(fill)),
      ).xdrAccountId(),
    }),
  );

describe('rpc client', () => {
  it('reads health, network and latest ledger', async () => {
    const { rpc } = setup({
      getHealth: fixtures.getHealth,
      getNetwork: fixtures.getNetwork,
      getLatestLedger: fixtures.getLatestLedger,
    });
    const health = await rpc.getHealth();
    expect(health.ok && health.value).toMatchObject({
      status: 'healthy',
      oldestLedger: 64601827,
      ledgerRetentionWindow: 120960,
    });
    const network = await rpc.getNetwork();
    expect(network.ok && network.value.passphrase).toBe(
      'Public Global Stellar Network ; September 2015',
    );
    const latest = await rpc.getLatestLedger();
    expect(latest.ok && latest.value).toMatchObject({ sequence: 64722786, closeTime: 1790899712 });
  });

  it('sends a constant id so identical calls share a cache key', async () => {
    const { rpc, calls } = setup({ getNetwork: fixtures.getNetwork });
    await rpc.getNetwork();
    expect(calls[0]?.body).toEqual({ jsonrpc: '2.0', id: 1, method: 'getNetwork' });
  });

  it('decodes ledger entries with liveUntilLedgerSeq', async () => {
    const { rpc } = setup({ getLedgerEntries: fixtures.getLedgerEntries });
    const result = await rpc.getLedgerEntries(['k1', 'k2', 'k3']);
    if (!result.ok) throw new Error(result.error.message);
    const [account, instance] = result.value.entries;
    expect(result.value.entries).toHaveLength(2);
    expect(account?.data.type).toBe('account');
    expect(account?.liveUntilLedgerSeq).toBeNull();
    expect(instance?.data.type).toBe('contractData');
    expect(instance?.liveUntilLedgerSeq).toBe(67326585);
  });

  it('batches ledger keys at 200 per call', async () => {
    const { rpc, calls } = setup({
      getLedgerEntries: { jsonrpc: '2.0', id: 1, result: { latestLedger: 5 } },
    });
    const keys = Array.from({ length: 450 }, (_, i) => accountKey(i % 250));
    const result = await rpc.getLedgerEntries(keys);
    expect(result).toEqual({ ok: true, value: { latestLedger: 5, entries: [] } });
    const sent = calls.map((call) => (call.body as { params: { keys: string[] } }).params.keys);
    expect(sent.map((batch) => batch.length)).toEqual([200, 200, 50]);
    expect(sent[0]?.[0]).toBe(keys[0]?.toXdr('base64'));
  });

  it('pages transactions and parses createdAt', async () => {
    const { rpc, calls } = setup({ getTransactions: fixtures.getTransactions });
    const page = await rpc.getTransactions({ startLedger: 64722700, limit: 3 });
    if (!page.ok) throw new Error(page.error.message);
    expect(page.value.transactions[0]).toMatchObject({
      status: 'FAILED',
      ledger: 64722700,
      createdAt: 1790899282,
      feeBump: false,
    });
    expect(calls[0]?.body).toMatchObject({
      params: { startLedger: 64722700, pagination: { limit: 3 }, xdrFormat: 'base64' },
    });
  });

  it('iterates a ledger range with cursors and stops past the end', async () => {
    const tx = fixtures.getTransactions.result.transactions[0];
    const page = (ledgers: number[], cursor: string) => ({
      jsonrpc: '2.0',
      id: 1,
      result: {
        ...fixtures.getTransactions.result,
        cursor,
        transactions: ledgers.map((ledger) => ({ ...tx, ledger })),
      },
    });
    const pages = [page([10, 10], 'c1'), page([11, 12], 'c2'), page([13, 14], 'c3')];
    const { http, calls } = mockHttp(() => jsonResponse(pages.shift()));
    const rpc = createRpcClient({ http, url: RPC_URL });
    const seen: number[] = [];
    for await (const result of rpc.iterateTransactions({
      startLedger: 10,
      endLedger: 13,
      limit: 2,
    })) {
      if (!result.ok) throw new Error(result.error.message);
      seen.push(...result.value.transactions.map((t) => t.ledger));
    }
    expect(seen).toEqual([10, 10, 11, 12, 13]);
    expect(
      calls.map((call) => (call.body as { params: { pagination: object } }).params.pagination),
    ).toEqual([{ limit: 2 }, { cursor: 'c1', limit: 2 }, { cursor: 'c2', limit: 2 }]);
  });

  it('stops iterating when a page comes back short', async () => {
    const { rpc, calls } = setup({ getTransactions: fixtures.getTransactions });
    const pages = [];
    for await (const page of rpc.iterateTransactions({ startLedger: 1, endLedger: 10 ** 9 }))
      pages.push(page);
    expect(pages).toHaveLength(1);
    expect(calls).toHaveLength(1);
  });

  it('only caches full transaction pages', async () => {
    const cache = new MemoryCache();
    const mock = mockHttp(() => jsonResponse(fixtures.getTransactions), { cache });
    const rpc = createRpcClient({ http: mock.http, url: RPC_URL });
    await rpc.getTransactions({ startLedger: 1, limit: 2 });
    expect(cache.entries.size).toBe(1);
    await rpc.getTransactions({ startLedger: 1, limit: 200 });
    expect(cache.entries.size).toBe(1);
  });

  it('returns a transaction or null when not found, caching only hits', async () => {
    const cache = new MemoryCache();
    const mock = mockHttp(
      (_url, init) => {
        const body = JSON.parse(String(init.body)) as { params: { hash: string } };
        return jsonResponse(
          body.params.hash === 'missing'
            ? fixtures.getTransactionNotFound
            : fixtures.getTransaction,
        );
      },
      { cache },
    );
    const rpc = createRpcClient({ http: mock.http, url: RPC_URL });
    const found = await rpc.getTransaction('6c37');
    expect(found.ok && found.value?.status).toBe('FAILED');
    expect(await rpc.getTransaction('missing')).toEqual({ ok: true, value: null });
    expect(cache.entries.size).toBe(1);
  });

  it('simulates a transaction', async () => {
    const { rpc, calls } = setup({ simulateTransaction: fixtures.simulateTransaction.response });
    const result = await rpc.simulateTransaction(fixtures.simulateTransaction.envelope);
    expect(result.ok && result.value.minResourceFee).toBe('1496565');
    expect(calls[0]?.body).toMatchObject({
      params: { transaction: fixtures.simulateTransaction.envelope },
    });
  });

  it('surfaces json-rpc errors as typed failures and does not cache them', async () => {
    const cache = new MemoryCache();
    const mock = mockHttp(() => jsonResponse(fixtures.error), { cache });
    const rpc = createRpcClient({ http: mock.http, url: RPC_URL });
    const result = await rpc.getTransactions({ startLedger: 1 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.meta).toMatchObject({ kind: 'rpc', rpcCode: -32600 });
    expect(cache.entries.size).toBe(0);
  });

  it('has no sendTransaction', () => {
    const { rpc } = setup({});
    expect('sendTransaction' in rpc).toBe(false);
  });
});

describe('stripTransactionMeta', () => {
  it('drops result meta and events from pages and single results', () => {
    const page = JSON.stringify({
      result: { cursor: 'c', transactions: [{ txHash: 'a', resultMetaXdr: 'x', events: {} }] },
    });
    expect(JSON.parse(stripTransactionMeta(page))).toEqual({
      result: { cursor: 'c', transactions: [{ txHash: 'a' }] },
    });
    const single = JSON.stringify({ result: { status: 'SUCCESS', resultMetaXdr: 'x' } });
    expect(JSON.parse(stripTransactionMeta(single))).toEqual({ result: { status: 'SUCCESS' } });
    expect(stripTransactionMeta('not json')).toBe('not json');
  });
});
