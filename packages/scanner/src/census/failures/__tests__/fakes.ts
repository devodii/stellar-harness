import { appError, err, ok } from '@harness/schema';
import type { DecodedResultCodes, EnvelopeSummary } from '@harness/stellar-tools';
import type { Decoders } from '../extract';
import type { HorizonAccount, HorizonPort, RpcPort, RpcTransaction, Runner } from '../ports';

export const sequentialRunner: Runner = async (tasks, worker) => {
  const results = [];
  const failures = [];
  for (const task of tasks) {
    try {
      results.push(await worker(task));
    } catch (error) {
      failures.push({ task, error });
    }
  }
  return { results, failures };
};

const unimplemented = async () => err(appError('INTERNAL', 'not implemented in fake'));

export const fakeRpc = (overrides: Partial<RpcPort>): RpcPort => ({
  getLatestLedger: unimplemented,
  getLedgerEntries: unimplemented,
  simulateTransaction: unimplemented,
  getTransactions: unimplemented,
  ...overrides,
});

export type PagedRpcCall = { startLedger?: number; cursor?: string; limit?: number };

export const pagedRpc = (
  transactions: RpcTransaction[],
  bounds: { oldestLedger: number; latestLedger: number },
) => {
  const calls: PagedRpcCall[] = [];
  const rpc = fakeRpc({
    getTransactions: async (params) => {
      calls.push(params);
      const limit = params.limit ?? 200;
      const from =
        params.cursor !== undefined
          ? Number(params.cursor)
          : transactions.findIndex((tx) => tx.ledger >= (params.startLedger ?? 0));
      const start = from === -1 ? transactions.length : from;
      const page = transactions.slice(start, start + limit);
      return ok({
        transactions: page,
        cursor: String(start + page.length),
        oldestLedger: bounds.oldestLedger,
        latestLedger: bounds.latestLedger,
      });
    },
  });
  return { rpc, calls };
};

export const syntheticTx = (
  ledger: number,
  order: number,
  status: RpcTransaction['status'] = 'SUCCESS',
): RpcTransaction => ({
  txHash: `${ledger}-${order}`,
  ledger,
  status,
  applicationOrder: order,
  feeBump: false,
  envelopeXdr: `env-${ledger}-${order}`,
  resultXdr: `res-${ledger}-${order}`,
  createdAt: ledger * 5,
});

export type HorizonOperationsPage = {
  _embedded: { records: { type: string; funder?: string }[] };
};

export const firstOperationOf = (page: HorizonOperationsPage) => {
  const record = page._embedded.records[0];
  return record ? { type: record.type, funder: record.funder } : null;
};

export type FakeHorizonData = {
  accounts?: Record<string, HorizonAccount | null>;
  firstOperations?: Record<string, { type: string; funder?: string } | null>;
  failing?: Set<string>;
};

export const fakeHorizon = (data: FakeHorizonData) => {
  const calls: string[] = [];
  const port: HorizonPort = {
    account: async (id) => {
      calls.push(`account:${id}`);
      if (data.failing?.has(id)) return err(appError('UPSTREAM_TIMEOUT', 'horizon timeout'));
      return ok(data.accounts?.[id] ?? null);
    },
    firstOperation: async (id) => {
      calls.push(`firstOperation:${id}`);
      if (data.failing?.has(id)) return err(appError('UPSTREAM_TIMEOUT', 'horizon timeout'));
      return ok(data.firstOperations?.[id] ?? null);
    },
  };
  return { port, calls };
};

export type RecordedSample = {
  envelopeXdr: string;
  resultXdr: string;
  expected: { result: DecodedResultCodes; envelope: EnvelopeSummary };
};

export const recordedDecoders = (samples: RecordedSample[]): Decoders => {
  const results = new Map(samples.map((s) => [s.resultXdr, s.expected.result]));
  const envelopes = new Map(samples.map((s) => [s.envelopeXdr, s.expected.envelope]));
  const lookup = <T>(map: Map<string, T>, key: string): T => {
    const value = map.get(key);
    if (!value) throw new Error(`no recorded decoding for ${key.slice(0, 16)}`);
    return value;
  };
  return {
    decodeResultCodes: (xdr) => {
      const { tx, ops, feeBump } = lookup(results, xdr);
      return { tx, ops, feeBump };
    },
    decodeEnvelopeSummary: (xdr) => lookup(envelopes, xdr),
  };
};

type FixtureTransaction = Omit<RpcTransaction, 'status'> & { status: string };

export const asRpcTransaction = (tx: FixtureTransaction): RpcTransaction => ({
  txHash: tx.txHash,
  ledger: tx.ledger,
  status: tx.status === 'FAILED' ? 'FAILED' : 'SUCCESS',
  applicationOrder: tx.applicationOrder,
  feeBump: tx.feeBump,
  envelopeXdr: tx.envelopeXdr,
  resultXdr: tx.resultXdr,
  createdAt: tx.createdAt,
});
