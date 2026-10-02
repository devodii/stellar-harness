import { portDecoders } from '@harness/stellar-tools';
import { fakeFetcher, fakeHorizon, fakeRpc } from '@harness/stellar-tools/contracts/testing';
import { MemoryStorage } from '@harness/storage';
import type { AgentToolContext } from './tools';

export const TEST_LEDGER = 59_000_000;

export const createTestContext = (overrides: Partial<AgentToolContext> = {}): AgentToolContext => ({
  storage: new MemoryStorage(),
  policy: { spendCapXlm: 5 },
  stellarlight: { get: async () => ({}) },
  rpc: fakeRpc({ latestLedger: TEST_LEDGER }),
  horizon: fakeHorizon(),
  fetch: fakeFetcher({}),
  stellarExpertUrl: 'https://expert.test',
  rpcUrl: 'https://rpc.test',
  horizonUrl: 'https://horizon.test',
  ...portDecoders,
  latestLedger: async () => TEST_LEDGER,
  ...overrides,
});
