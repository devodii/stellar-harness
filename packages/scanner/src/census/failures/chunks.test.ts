import { describe, expect, it } from 'vitest';
import { appError, err } from '../../schema';
import page from './__fixtures__/rpc-get-transactions-page.json';
import { asRpcTransaction, fakeRpc, pagedRpc, syntheticTx } from './__tests__/fakes';
import { planChunks, scanChunk } from './chunks';
import type { RpcTransaction } from './ports';

const bounds = { oldestLedger: 1, latestLedger: 1000 };

const ledgerOf = (ledger: number, count: number, failedEvery = 0): RpcTransaction[] =>
  Array.from({ length: count }, (_, i) =>
    syntheticTx(ledger, i + 1, failedEvery > 0 && i % failedEvery === 0 ? 'FAILED' : 'SUCCESS'),
  );

describe('planChunks', () => {
  it('splits an inclusive range into fixed size chunks', () => {
    expect(planChunks(100, 124, { chunkLedgers: 10 })).toEqual([
      { id: 0, start: 100, end: 109 },
      { id: 1, start: 110, end: 119 },
      { id: 2, start: 120, end: 124 },
    ]);
  });

  it('handles a single ledger range', () => {
    expect(planChunks(5, 5, { chunkLedgers: 10 })).toEqual([{ id: 0, start: 5, end: 5 }]);
  });

  it('keeps every nth chunk when sampling', () => {
    const chunks = planChunks(1, 50, { chunkLedgers: 10, sampleEvery: 2 });
    expect(chunks.map((c) => c.id)).toEqual([0, 2, 4]);
  });
});

describe('scanChunk', () => {
  it('pages from the chunk start until a transaction passes the chunk end', async () => {
    const txs = [...ledgerOf(10, 3), ...ledgerOf(11, 5, 2), ...ledgerOf(12, 4), ...ledgerOf(13, 2)];
    const { rpc, calls } = pagedRpc(txs, bounds);
    const result = await scanChunk(rpc, { id: 0, start: 11, end: 12 }, { pageLimit: 3 });
    if (!result.ok) throw new Error(result.error.message);
    expect(result.value.totals).toEqual([
      { ledger: 11, txCount: 5, failedCount: 3 },
      { ledger: 12, txCount: 4, failedCount: 0 },
    ]);
    expect(result.value.failed.map((tx) => tx.txHash)).toEqual(['11-1', '11-3', '11-5']);
    expect(result.value.txSeen).toBe(9);
    expect(calls[0]).toEqual({ startLedger: 11, limit: 3 });
    expect(calls.slice(1).every((call) => call.cursor !== undefined)).toBe(true);
    expect(result.value.calls).toBe(calls.length);
  });

  it('stops when a page boundary falls exactly on the chunk end', async () => {
    const txs = [...ledgerOf(20, 2), ...ledgerOf(21, 2)];
    const { rpc, calls } = pagedRpc(txs, bounds);
    const result = await scanChunk(rpc, { id: 0, start: 20, end: 20 }, { pageLimit: 2 });
    expect(result.ok && result.value.totals).toEqual([{ ledger: 20, txCount: 2, failedCount: 0 }]);
    expect(calls).toHaveLength(2);
  });

  it('records zero totals for ledgers without transactions', async () => {
    const txs = [...ledgerOf(30, 1), ...ledgerOf(32, 1), ...ledgerOf(40, 1)];
    const { rpc } = pagedRpc(txs, bounds);
    const result = await scanChunk(rpc, { id: 0, start: 30, end: 33 });
    expect(result.ok && result.value.totals.map((t) => t.txCount)).toEqual([1, 0, 1, 0]);
  });

  it('treats an empty page at the tip as complete when RPC reached the chunk end', async () => {
    const { rpc } = pagedRpc(ledgerOf(50, 2), { oldestLedger: 1, latestLedger: 51 });
    const result = await scanChunk(rpc, { id: 0, start: 50, end: 51 });
    expect(result.ok && result.value.totals).toEqual([
      { ledger: 50, txCount: 2, failedCount: 0 },
      { ledger: 51, txCount: 0, failedCount: 0 },
    ]);
  });

  it('fails when RPC has not reached the chunk end', async () => {
    const { rpc } = pagedRpc(ledgerOf(50, 2), { oldestLedger: 1, latestLedger: 50 });
    const result = await scanChunk(rpc, { id: 0, start: 50, end: 60 });
    expect(result.ok).toBe(false);
  });

  it('propagates RPC errors with the chunk attached', async () => {
    const rpc = fakeRpc({
      getTransactions: async () => err(appError('RATE_LIMITED', 'slow down')),
    });
    const result = await scanChunk(rpc, { id: 3, start: 1, end: 2 });
    expect(result).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', meta: { chunk: { id: 3 }, calls: 1 } },
    });
  });

  it('enforces a call budget', async () => {
    const txs = ledgerOf(70, 10);
    const { rpc } = pagedRpc(txs, bounds);
    const result = await scanChunk(
      rpc,
      { id: 0, start: 70, end: 70 },
      { pageLimit: 1, maxCalls: 3 },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_FAILED' } });
  });

  it('counts a recorded live page', async () => {
    const txs = page.transactions.map(asRpcTransaction);
    const first = txs[0]?.ledger ?? 0;
    const { rpc } = pagedRpc(txs, page);
    const result = await scanChunk(rpc, { id: 0, start: first, end: first + 1 });
    if (!result.ok) throw new Error(result.error.message);
    const failed = txs.filter((tx) => tx.status === 'FAILED').length;
    expect(result.value.failed).toHaveLength(failed);
    expect(result.value.txSeen).toBe(txs.length);
  });
});
