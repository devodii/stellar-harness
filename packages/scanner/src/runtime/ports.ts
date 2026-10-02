import type { NetworkClients } from '@harness/stellar-tools';
import type { Fetcher, HorizonPort, RpcPort } from '@harness/stellar-tools/contracts';
import { ok, type Result } from '../schema';

export type Ports = { fetch: Fetcher; rpc: RpcPort; horizon: HorizonPort };

const mapResult = <A, B>(result: Result<A>, map: (value: A) => B): Result<B> =>
  result.ok ? ok(map(result.value)) : result;

const createFetcher =
  ({ http }: Pick<NetworkClients, 'http'>): Fetcher =>
  async (url, init = {}) =>
    mapResult(await http.request({ url, ...init }), (response) => ({
      url: response.finalUrl,
      status: response.status,
      headers: response.headers,
      body: response.body,
      ms: response.ms,
      cached: response.cached,
    }));

const createRpcPort = ({ rpc }: Pick<NetworkClients, 'rpc'>): RpcPort => ({
  getLatestLedger: async () =>
    mapResult(await rpc.getLatestLedger(), ({ sequence, protocolVersion }) => ({
      sequence,
      protocolVersion,
    })),
  getLedgerEntries: async (keys) =>
    mapResult(await rpc.getLedgerEntries(keys), ({ latestLedger, entries }) => ({
      latestLedger,
      entries: entries.map((entry) => ({
        key: entry.key,
        xdr: entry.data.toXDR('base64'),
        lastModifiedLedgerSeq: entry.lastModifiedLedgerSeq,
        liveUntilLedgerSeq: entry.liveUntilLedgerSeq ?? undefined,
      })),
    })),
  simulateTransaction: (txXdr) => rpc.simulateTransaction(txXdr),
  getTransactions: async ({ startLedger, cursor, limit }) =>
    rpc.getTransactions(cursor ? { cursor, limit } : { startLedger: startLedger ?? 0, limit }),
});

const createHorizonPort = ({ horizon }: Pick<NetworkClients, 'horizon'>): HorizonPort => ({
  account: (id) => horizon.account(id),
  firstOperation: async (accountId) =>
    mapResult(await horizon.accountOperations(accountId, { order: 'asc', limit: 1 }), (page) => {
      const [first] = page.records;
      return first ? { type: first.type, funder: first.funder } : null;
    }),
});

export const createPorts = (clients: NetworkClients): Ports => ({
  fetch: createFetcher(clients),
  rpc: createRpcPort(clients),
  horizon: createHorizonPort(clients),
});
