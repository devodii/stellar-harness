import 'server-only';
import { createAgentTools } from '@harness/agent';
import type { Action, OrgAccount, OrgContract } from '@harness/schema';
import {
  type AnchorProbe,
  type ContractTtl,
  createClients,
  getAccount,
  getContractTtl,
  probeAnchor,
} from '@harness/stellar-tools';
import { MemoryStorage } from '@harness/storage';
import { DEMO_ORG } from '@/demo-org';
import { getServerEnv } from './env';
import { ttlCache } from './memo';

getServerEnv();

const globals = globalThis as typeof globalThis & { harnessStorage?: MemoryStorage };
globals.harnessStorage ??= new MemoryStorage(DEMO_ORG);
const storage = globals.harnessStorage;
const clients = createClients(DEMO_ORG.network);

export const tools = createAgentTools(storage, clients);

type WatchedAccount = OrgAccount & { xlm: string | null };
export type WatchedContract = OrgContract & { ttl: ContractTtl | null };
export type Watch = {
  accounts: WatchedAccount[];
  contracts: WatchedContract[];
  anchor: AnchorProbe | null;
  actions: Action[];
};

const settle = <T>(promise: Promise<T>): Promise<T | null> => promise.catch(() => null);

const liveCache = ttlCache<Pick<Watch, 'accounts' | 'contracts'>>(30_000);
const anchorCache = ttlCache<AnchorProbe | null>(600_000);

const readAccountsAndContracts = async () => ({
  accounts: await Promise.all(
    DEMO_ORG.accounts.map(async (account) => ({
      ...account,
      xlm: (await settle(getAccount(clients, account.address)))?.xlm ?? null,
    })),
  ),
  contracts: await Promise.all(
    DEMO_ORG.contracts.map(async (contract) => ({
      ...contract,
      ttl: await settle(getContractTtl(clients, contract.id)),
    })),
  ),
});

const readAnchor = async () =>
  DEMO_ORG.anchorDomain ? settle(probeAnchor(clients, DEMO_ORG.anchorDomain)) : null;

export const readWatch = async (): Promise<Watch> => {
  const [live, anchor, actions] = await Promise.all([
    liveCache.get(readAccountsAndContracts),
    anchorCache.get(readAnchor),
    storage.listActions(),
  ]);
  return { ...live, anchor, actions };
};
