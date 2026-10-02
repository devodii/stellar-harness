import { fakeFetcher, fakeHorizon, fakeRpc } from '@harness/stellar-tools/contracts/testing';
import { MemoryStorage } from '@harness/storage';
import type { AgentToolContext } from './tools';

export const createTestContext = (overrides: Partial<AgentToolContext> = {}): AgentToolContext => ({
  storage: new MemoryStorage(),
  policy: { spendCapXlm: 5 },
  stellarlight: { get: async () => ({}) },
  rpc: fakeRpc(),
  horizon: fakeHorizon(),
  fetch: fakeFetcher({}),
  stellarExpertUrl: 'https://expert.test',
  ...overrides,
});
