import type { Org } from '@harness/schema';
import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { isWithinPolicy, proposeAction } from './propose-action';

const ESCROW = 'CADKCKAZEOUXFS46JTA73DFGCWUGTZDKU5UTUAEA6OAZB7RV5CEHS47R';

const org: Org = {
  id: 'demo',
  name: 'Demo Treasury Ltd',
  network: 'testnet',
  accounts: [],
  contracts: [{ id: ESCROW, label: 'Escrow' }],
  anchorDomain: 'testanchor.stellar.org',
  policy: { dailySpendXlm: 50, allowedOperations: ['extend_ttl', 'restore'], approvalAboveXlm: 10 },
};

const extend = {
  subject: ESCROW,
  title: 'Extend TTL on Escrow by 365 days',
  why: 'Escrow archives in 6 days.',
  operation: 'extend_ttl' as const,
  estimatedCostXlm: 4,
};

describe('isWithinPolicy', () => {
  it('allows an allowed operation at or under the approval threshold', () => {
    expect(isWithinPolicy(org.policy, extend)).toBe(true);
    expect(isWithinPolicy(org.policy, { ...extend, estimatedCostXlm: 10 })).toBe(true);
  });

  it('needs approval above the threshold, without a cost, or for other operations', () => {
    expect(isWithinPolicy(org.policy, { ...extend, estimatedCostXlm: 27.3 })).toBe(false);
    expect(isWithinPolicy(org.policy, { ...extend, estimatedCostXlm: undefined })).toBe(false);
    expect(isWithinPolicy(org.policy, { ...extend, operation: 'payment' })).toBe(false);
    expect(isWithinPolicy(org.policy, { ...extend, operation: 'unsupported' })).toBe(false);
  });
});

describe('proposeAction', () => {
  it('stores a proposed action with withinPolicy computed', async () => {
    const storage = new MemoryStorage(org);
    const action = await proposeAction(storage, { ...extend, estimatedCostXlm: 27.3 });
    expect(action).toMatchObject({ status: 'proposed', withinPolicy: false, subject: ESCROW });
    expect(await storage.listActions()).toEqual([action]);
  });

  it('rejects a subject outside the organisation', async () => {
    await expect(
      proposeAction(new MemoryStorage(org), { ...extend, subject: 'CSOMEONEELSE' }),
    ).rejects.toThrow('does not belong to Demo Treasury Ltd');
  });
});
