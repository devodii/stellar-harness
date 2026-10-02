import { NETWORK_PROFILES, ok } from '@harness/schema';
import { createPortDecoders } from '@harness/stellar-tools';
import { fakeFetcher, fakeHorizon, fakeRpc } from '@harness/stellar-tools/contracts/testing';
import { MemoryStorage } from '@harness/storage';
import type { AgentToolContext } from './tools';

export const TEST_LEDGER = 59_000_000;

export const createTestContext = (overrides: Partial<AgentToolContext> = {}): AgentToolContext => ({
  storage: new MemoryStorage(),
  stellarlight: { get: async () => ({}) },
  rpc: fakeRpc({ latestLedger: TEST_LEDGER }),
  horizon: fakeHorizon(),
  fetch: fakeFetcher({}),
  stellarExpertUrl: 'https://expert.test',
  rpcUrl: 'https://rpc.test',
  horizonUrl: 'https://horizon.test',
  ...createPortDecoders(NETWORK_PROFILES.mainnet.passphrase),
  latestLedger: async () => TEST_LEDGER,
  networkStatus: {
    latestLedger: async () => ok({ sequence: TEST_LEDGER, protocolVersion: 29 }),
    health: async () =>
      ok({
        status: 'healthy',
        oldestLedger: TEST_LEDGER - 120_960,
        ledgerRetentionWindow: 120_960,
      }),
    horizonLedger: async () => ok({ sequence: TEST_LEDGER }),
  },
  ...overrides,
});
