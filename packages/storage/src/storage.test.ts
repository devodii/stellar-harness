import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptySummary, type Finding, SUGGESTED_ACTION } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { createStorage, JsonFileStorage, MemoryStorage, type Storage } from './index';

const snapshot = {
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network: 'mainnet' as const,
};

const finding = (n: number, overrides: Partial<Finding> = {}): Finding => ({
  findingId: n.toString(16).padStart(64, '0'),
  type: 'OP_NO_TRUST_CLUSTER',
  subjectKind: 'account',
  subject: `G${n}`,
  severity: 'high',
  evidence: { count: n },
  suggestedAction: SUGGESTED_ACTION.OP_NO_TRUST_CLUSTER,
  snapshotLedger: 100,
  observedAt: snapshot.snapshotTime,
  tags: [],
  ...overrides,
});

const contract = (name: string, make: () => Promise<Storage>) =>
  describe(name, () => {
    it('stores, dedupes and filters findings', async () => {
      const storage = await make();
      await storage.putFindings([finding(1), finding(2, { severity: 'low', tags: ['anchor'] })]);
      await storage.putFindings([finding(1)]);
      expect((await storage.queryFindings({})).total).toBe(2);
      expect((await storage.queryFindings({ tags: ['anchor'] })).rows[0]?.subject).toBe('G2');
      expect((await storage.queryFindings({ severity: ['high'] })).total).toBe(1);
      expect(await storage.getFinding(finding(2).findingId)).toMatchObject({ subject: 'G2' });
    });

    it('round trips the summary and snapshot', async () => {
      const storage = await make();
      expect(await storage.getSummary()).toBeNull();
      await storage.putSummary(emptySummary(snapshot));
      expect((await storage.getSnapshot())?.snapshotLedger).toBe(100);
    });
  });

contract('MemoryStorage', async () => new MemoryStorage());
contract(
  'JsonFileStorage',
  async () => new JsonFileStorage(await mkdtemp(join(tmpdir(), 'harness-'))),
);

describe('createStorage', () => {
  it('falls back to memory without a data dir', () => {
    expect(createStorage()).toBeInstanceOf(MemoryStorage);
  });
});
