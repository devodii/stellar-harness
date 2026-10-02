import 'server-only';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
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

const rootEnv = resolve(process.cwd(), '../../.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

const globals = globalThis as typeof globalThis & { harnessStorage?: MemoryStorage };
globals.harnessStorage ??= new MemoryStorage(DEMO_ORG);
export const storage = globals.harnessStorage;
export const clients = createClients(DEMO_ORG.network);
export const tools = createAgentTools(storage, clients);

const cached = <T>(ttlMs: number, load: () => Promise<T>): (() => Promise<T>) => {
  let entry: { at: number; value: Promise<T> } | null = null;
  return () => {
    if (!entry || Date.now() - entry.at > ttlMs) {
      const value = load().catch((error) => {
        entry = null;
        throw error;
      });
      entry = { at: Date.now(), value };
    }
    return entry.value;
  };
};

const settle = <T>(promise: Promise<T>): Promise<T | null> => promise.catch(() => null);

export type WatchedAccount = OrgAccount & { xlm: string | null };
export type WatchedContract = OrgContract & { ttl: ContractTtl | null };
export type Watch = {
  accounts: WatchedAccount[];
  contracts: WatchedContract[];
  anchor: AnchorProbe | null;
  actions: Action[];
};

const readAccountsAndContracts = cached(30_000, async () => ({
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
}));

const readAnchor = cached(600_000, async () =>
  DEMO_ORG.anchorDomain ? settle(probeAnchor(clients, DEMO_ORG.anchorDomain)) : null,
);

export const readWatch = async (): Promise<Watch> => {
  const [live, anchor, actions] = await Promise.all([
    readAccountsAndContracts(),
    readAnchor(),
    storage.listActions(),
  ]);
  return { ...live, anchor, actions };
};
