import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { emptySummary, type Finding, SUGGESTED_ACTION } from '../schema';
import { JsonFileStorage } from './json-file';

const snapshot = {
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network: 'mainnet' as const,
};

const finding = (n: number): Finding => ({
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
});

const storage = async () => new JsonFileStorage(await mkdtemp(join(tmpdir(), 'harness-')));

describe('JsonFileStorage', () => {
  it('stores and dedupes findings across instances', async () => {
    const first = await storage();
    await first.putFindings([finding(1), finding(2)]);
    await first.putFindings([finding(1)]);
    expect(await first.listFindings()).toHaveLength(2);
    expect(await first.getFinding(finding(2).findingId)).toMatchObject({ subject: 'G2' });

    const reopened = new JsonFileStorage(join(first.findingsPath, '..'));
    expect(await reopened.listFindings()).toHaveLength(2);
  });

  it('round trips the summary', async () => {
    const files = await storage();
    expect(await files.getSummary()).toBeNull();
    await files.putSummary(emptySummary(snapshot));
    expect((await files.getSummary())?.snapshot.snapshotLedger).toBe(100);
  });
});
