import { emptySummary, type Finding, type Network } from '@harness/schema';
import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { scopeStorageToNetwork } from './scoped-storage';

const snapshotFor = (network: Network) => ({
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network,
});

const finding = { findingId: 'f1' } as Finding;

const seeded = async (network: Network) => {
  const storage = new MemoryStorage({ summary: emptySummary(snapshotFor(network)) });
  await storage.putFindings([finding]);
  return storage;
};

describe('scopeStorageToNetwork', () => {
  it('passes reads through when the data belongs to the network', async () => {
    const scoped = scopeStorageToNetwork(await seeded('testnet'), 'testnet');
    expect((await scoped.getSummary())?.snapshot.network).toBe('testnet');
    expect((await scoped.queryFindings({})).total).toBe(1);
    expect(await scoped.getFinding('f1')).toEqual(finding);
  });

  it('hides data scanned on another network', async () => {
    const scoped = scopeStorageToNetwork(await seeded('mainnet'), 'testnet');
    expect(await scoped.getSummary()).toBeNull();
    expect(await scoped.getSnapshot()).toBeNull();
    expect(await scoped.queryFindings({})).toEqual({ rows: [], total: 0 });
    expect(await scoped.getFinding('f1')).toBeNull();
  });

  it('keeps the waitlist shared across networks', async () => {
    const scoped = scopeStorageToNetwork(await seeded('mainnet'), 'testnet');
    await scoped.putWaitlist({
      email: 'ops@example.org',
      createdAt: '2026-10-02T00:00:00.000Z',
      userAgent: 'vitest',
    });
    expect(await scoped.countWaitlist()).toBe(1);
  });
});
