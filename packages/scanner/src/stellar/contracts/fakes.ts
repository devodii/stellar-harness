import { StrKey } from '@stellar/stellar-sdk';
import { appError, err, ok, type Result } from '../../schema';
import type {
  Fetcher,
  HorizonAccount,
  HorizonPort,
  LedgerEntryResult,
  RpcPort,
  SimulateTransactionResult,
} from './ports';

type FakeRpcOptions = {
  entries?: LedgerEntryResult[];
  latestLedger?: number;
  simulate?: (txXdr: string) => Result<SimulateTransactionResult>;
};

export type FakeRpc = RpcPort & { calls: { getLedgerEntries: string[][]; simulate: string[] } };

export const fakeRpc = (options: FakeRpcOptions = {}): FakeRpc => {
  const calls = { getLedgerEntries: [] as string[][], simulate: [] as string[] };
  const latestLedger = options.latestLedger ?? 1;
  return {
    calls,
    getLatestLedger: async () => ok({ sequence: latestLedger, protocolVersion: 23 }),
    getLedgerEntries: async (keys) => {
      calls.getLedgerEntries.push(keys);
      const wanted = new Set(keys);
      return ok({
        entries: (options.entries ?? []).filter((entry) => wanted.has(entry.key)),
        latestLedger,
      });
    },
    simulateTransaction: async (txXdr) => {
      calls.simulate.push(txXdr);
      return options.simulate
        ? options.simulate(txXdr)
        : err(appError('UPSTREAM_FAILED', 'no simulation configured'));
    },
    getTransactions: async () =>
      ok({ transactions: [], cursor: '', latestLedger, oldestLedger: 1 }),
  };
};

export const fakeHorizon = (accounts: HorizonAccount[] = []): HorizonPort => ({
  account: async (id) => ok(accounts.find((account) => account.id === id) ?? null),
  firstOperation: async () => ok(null),
});

export const fakeFetcher =
  (routes: Record<string, { status?: number; body: unknown }>): Fetcher =>
  async (url) => {
    const route = routes[url];
    if (!route) return ok({ url, status: 404, headers: {}, body: '{}', ms: 0, cached: false });
    return ok({
      url,
      status: route.status ?? 200,
      headers: { 'content-type': 'application/json' },
      body: typeof route.body === 'string' ? route.body : JSON.stringify(route.body),
      ms: 0,
      cached: false,
    });
  };

export const syntheticContractId = (seed: number): string => {
  const bytes = Buffer.alloc(32);
  bytes.writeUInt32BE(seed, 28);
  return StrKey.encodeContract(bytes);
};
