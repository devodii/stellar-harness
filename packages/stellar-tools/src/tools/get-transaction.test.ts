import { describe, expect, it } from 'vitest';
import { invokeTool } from '../tool';
import horizonTx from './__fixtures__/horizon-transaction-failed.json';
import rpcTx from './__fixtures__/rpc-get-transaction-failed.json';
import rpcNotFound from './__fixtures__/rpc-get-transaction-not-found.json';
import { type FakeRoute, fakeFetcher } from './__tests__/fakes';
import type { EnvelopeSummary } from './decoder-schemas';
import { getTransaction, toTimebounds } from './get-transaction';

const HASH = 'fa122aa80b1379b51c1ba23a6d965ff1c326b61f0d9df032090b2c119a90377f';
const SOURCE = 'GB7IYR44HFYQDZMCEJ2N6W64CJAIPJE4ZW5Z5JMFEFWUHSFEBRXB6KMQ';
const RPC = 'https://rpc.test';
const HORIZON = 'https://horizon.test/';

const envelope: EnvelopeSummary = {
  sourceAccount: SOURCE,
  sequence: '195840793481715389',
  maxFee: '100',
  operationCount: 1,
  memoType: 'none',
  opTypes: ['payment'],
  operations: [
    {
      type: 'payment',
      destination: 'GAR2CITLNZGVHSK6Z3FMO44HCGXGZNZATJEM3ZVV6X75FGF6IZ27JSIQ',
      asset: 'XLM',
      amount: '334.7296509',
    },
  ],
  feeBump: false,
  timeBounds: { minTime: '0', maxTime: '1790889874' },
};

const decoders = {
  decodeResultCodes: (xdr: string) => {
    if (xdr !== rpcTx.result.resultXdr) throw new Error('unexpected result xdr');
    return { tx: 'tx_failed', ops: ['op_underfunded'], feeBump: false };
  },
  decodeEnvelopeSummary: (xdr: string) => {
    if (xdr !== rpcTx.result.envelopeXdr) throw new Error('unexpected envelope xdr');
    return envelope;
  },
};

const context = (route: (url: string) => FakeRoute | undefined) => {
  const { fetch, calls } = fakeFetcher(route);
  return { ctx: { fetch, rpcUrl: RPC, horizonUrl: HORIZON, ...decoders }, calls };
};

const expected = {
  hash: HASH,
  ledger: 64_720_813,
  createdAt: '2026-10-01T21:24:07.000Z',
  successful: false,
  source: SOURCE,
  feeCharged: 100,
  maxFee: 100,
  operationCount: 1,
  operations: [{ type: 'payment' }],
  memoType: 'none',
  timebounds: { minTime: null, maxTime: '2026-10-01T21:24:34.000Z' },
  resultCodes: { tx: 'tx_failed', ops: ['op_underfunded'] },
  feeBump: null,
};

describe('getTransaction', () => {
  it('reads a recorded failed transaction from RPC', async () => {
    const { ctx, calls } = context((url) =>
      url === RPC ? { status: 200, body: rpcTx } : undefined,
    );
    const result = await invokeTool(getTransaction, { hash: HASH.toUpperCase() }, ctx);
    expect(result).toMatchObject({ ok: true, data: expected });
    expect(calls).toHaveLength(1);
    expect(JSON.parse(calls[0]?.init?.body ?? '{}')).toMatchObject({
      method: 'getTransaction',
      params: { hash: HASH },
    });
  });

  it('falls back to Horizon when the hash is outside RPC retention', async () => {
    const { ctx, calls } = context((url) => {
      if (url === RPC) return { status: 200, body: rpcNotFound };
      if (url === `https://horizon.test/transactions/${HASH}`) {
        return { status: 200, body: horizonTx };
      }
      return undefined;
    });
    const result = await invokeTool(getTransaction, { hash: HASH }, ctx);
    expect(result).toMatchObject({ ok: true, data: expected });
    expect(calls.map((c) => c.url)).toEqual([RPC, `https://horizon.test/transactions/${HASH}`]);
  });

  it('falls back to Horizon when RPC errors', async () => {
    const { ctx } = context((url) => (url === RPC ? undefined : { status: 200, body: horizonTx }));
    const result = await invokeTool(getTransaction, { hash: HASH }, ctx);
    expect(result.ok).toBe(true);
  });

  it('reports NOT_FOUND when neither source has the hash', async () => {
    const { ctx } = context((url) =>
      url === RPC ? { status: 200, body: rpcNotFound } : { status: 404, body: {} },
    );
    const result = await invokeTool(getTransaction, { hash: HASH }, ctx);
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('maps fee bump details when the decoder provides them', async () => {
    const { ctx } = context(() => ({ status: 200, body: rpcTx }));
    const feeBumped = {
      ...ctx,
      decodeEnvelopeSummary: () => ({
        ...envelope,
        feeBump: true,
        feeSource: SOURCE,
        innerHash: HASH,
        operations: [{ type: 'payment', source: SOURCE }],
      }),
    };
    const result = await invokeTool(getTransaction, { hash: HASH }, feeBumped);
    expect(result).toMatchObject({
      ok: true,
      data: {
        feeBump: { feeSource: SOURCE, innerHash: HASH },
        operations: [{ type: 'payment', source: SOURCE }],
      },
    });
  });

  it('turns decoder failures into an upstream error', async () => {
    const { ctx } = context(() => ({ status: 200, body: rpcTx }));
    const broken = {
      ...ctx,
      decodeResultCodes: () => {
        throw new Error('bad xdr');
      },
    };
    const result = await invokeTool(getTransaction, { hash: HASH }, broken);
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_FAILED' } });
  });
});

describe('toTimebounds', () => {
  it('maps zero bounds to null and absent bounds to null', () => {
    expect(toTimebounds({ minTime: '0', maxTime: '0' })).toEqual({ minTime: null, maxTime: null });
    expect(toTimebounds(undefined)).toBeNull();
  });
});
