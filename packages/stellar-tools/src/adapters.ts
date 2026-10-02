import { ok, type Result } from '@harness/schema';
import type { NetworkClients } from './core/clients';
import type { HttpRequest as CoreRequest } from './core/http';
import type { Fetcher, HorizonPort, RpcPort } from './ports';

export type Ports = { fetch: Fetcher; rpc: RpcPort; horizon: HorizonPort };

const mapResult = <A, B>(result: Result<A>, map: (value: A) => B): Result<B> =>
  result.ok ? ok(map(result.value)) : result;

export const createFetcher =
  ({ http }: Pick<NetworkClients, 'http'>, defaults: Partial<CoreRequest> = {}): Fetcher =>
  async (url, init = {}) =>
    mapResult(await http.request({ ...defaults, url, ...init }), (response) => ({
      url: response.finalUrl,
      status: response.status,
      headers: response.headers,
      body: response.body,
      ms: response.ms,
      cached: response.cached,
    }));

export const createRpcPort = ({ rpc }: Pick<NetworkClients, 'rpc'>): RpcPort => ({
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
  simulateTransaction: (txXdr) => rpc.simulateTransaction(txXdr, { cache: false }),
  getTransactions: async ({ startLedger, cursor, limit }) =>
    rpc.getTransactions(cursor ? { cursor, limit } : { startLedger: startLedger ?? 0, limit }),
});

export const createHorizonPort = ({ horizon }: Pick<NetworkClients, 'horizon'>): HorizonPort => ({
  account: (id) => horizon.account(id),
  firstOperation: async (accountId) =>
    mapResult(await horizon.accountOperations(accountId, { order: 'asc', limit: 1 }), (page) => {
      const [first] = page.records;
      return first ? { type: first.type, funder: first.funder } : null;
    }),
});

export const createPorts = (
  clients: NetworkClients,
  fetchDefaults?: Partial<CoreRequest>,
): Ports => ({
  fetch: createFetcher(clients, fetchDefaults),
  rpc: createRpcPort(clients),
  horizon: createHorizonPort(clients),
});
