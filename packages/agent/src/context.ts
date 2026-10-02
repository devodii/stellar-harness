import {
  type ClientOptions,
  createClients,
  createPorts,
  fail,
  getTransaction,
  type NetworkClients,
  type NetworkConfig,
  NoCache,
  type Policy,
  portDecoders,
  type TransactionToolContext,
} from '@harness/stellar-tools';
import { DEFAULT_LEDGER_CLOSE_SECONDS } from '@harness/stellar-tools/contracts';
import type { Storage } from '@harness/storage';
import { z } from 'zod';
import type { AgentToolContext } from './tools';

export const createLiveClients = (
  config: NetworkConfig,
  options: Omit<ClientOptions, 'cache'> = {},
): NetworkClients => createClients(config, { ...options, cache: new NoCache() });

export type AgentContextOptions = {
  clients: NetworkClients;
  storage: Storage;
  policy: Policy;
  snapshotLedger?: number;
  ledgerCloseSeconds?: number;
};

export const createStellarlightGetter =
  ({ http, config }: Pick<NetworkClients, 'http' | 'config'>) =>
  async (path: string): Promise<unknown> => {
    const result = await http.getJson(
      new URL(path, config.STELLARLIGHT_URL).toString(),
      z.unknown(),
    );
    return result.ok
      ? result.value
      : fail(result.error.code, result.error.message, result.error.meta);
  };

export const createLatestLedger =
  ({ rpc }: Pick<NetworkClients, 'rpc'>) =>
  async (): Promise<number> => {
    const result = await rpc.getLatestLedger();
    return result.ok
      ? result.value.sequence
      : fail(result.error.code, result.error.message, result.error.meta);
  };

export const createAgentContext = ({
  clients,
  storage,
  policy,
  snapshotLedger,
  ledgerCloseSeconds = DEFAULT_LEDGER_CLOSE_SECONDS,
}: AgentContextOptions): AgentToolContext => {
  const ports = createPorts(clients);
  const transactions: TransactionToolContext = {
    fetch: ports.fetch,
    rpcUrl: clients.config.RPC_URL,
    horizonUrl: clients.config.HORIZON_URL,
    ...portDecoders,
  };
  return {
    ...ports,
    ...transactions,
    storage,
    policy,
    getTransaction: async (hash) => {
      const { resultCodes } = await getTransaction.run({ hash }, transactions);
      return { resultCodes };
    },
    stellarlight: { get: createStellarlightGetter(clients) },
    stellarExpertUrl: clients.config.STELLAR_EXPERT_URL,
    ledgerCloseSeconds,
    latestLedger:
      snapshotLedger === undefined ? createLatestLedger(clients) : async () => snapshotLedger,
  };
};
