import { mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Finding, SUGGESTED_ACTION } from '../schema';
import { JsonFileStorage } from '../storage/json-file';
import { createFindingSink, findingId, makeFinding } from './findings';

const snapshot = { snapshotLedger: 64722901 };
const observedAt = new Date('2026-10-02T00:18:07.000Z');
const ACCOUNT = 'GDN5XUMZW4BFT73ZPRA6GBI4IEPO45LEBSOMA3W3BXFBNBUAEN6IPUQK';

const cluster = (subject = ACCOUNT): Finding =>
  makeFinding(
    {
      type: 'TX_BAD_SEQ_CLUSTER',
      subjectKind: 'account',
      subject,
      severity: 'high',
      evidence: { count: 42, firstLedger: 1, lastLedger: 9, sameLedgerCollisions: 3 },
      tags: ['channel_pattern', 'channel_pattern'],
    },
    snapshot,
    observedAt,
  );

describe('findingId', () => {
  it('is a stable sha256 hex of type, subject and snapshot ledger', () => {
    const id = findingId('TX_BAD_SEQ_CLUSTER', ACCOUNT, 1);
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).toBe(findingId('TX_BAD_SEQ_CLUSTER', ACCOUNT, 1));
    expect(id).not.toBe(findingId('TX_BAD_SEQ_CLUSTER', ACCOUNT, 2));
    expect(id).not.toBe(findingId('OP_NO_TRUST_CLUSTER', ACCOUNT, 1));
  });
});

describe('makeFinding', () => {
  it('fills id, suggested action, snapshot ledger and observedAt', () => {
    expect(cluster()).toEqual({
      findingId: findingId('TX_BAD_SEQ_CLUSTER', ACCOUNT, 64722901),
      type: 'TX_BAD_SEQ_CLUSTER',
      subjectKind: 'account',
      subject: ACCOUNT,
      severity: 'high',
      evidence: { count: 42, firstLedger: 1, lastLedger: 9, sameLedgerCollisions: 3 },
      suggestedAction: SUGGESTED_ACTION.TX_BAD_SEQ_CLUSTER,
      snapshotLedger: 64722901,
      observedAt: '2026-10-02T00:18:07.000Z',
      tags: ['channel_pattern'],
    });
  });
});

describe('createFindingSink', () => {
  it('appends to data/findings.jsonl and de-dupes by id across sinks', async () => {
    const dataDir = await mkdtemp(join(tmpdir(), 'harness-findings-'));
    const sink = createFindingSink(dataDir);
    expect(await sink.emit(cluster())).toBe(true);
    expect(await sink.emit(cluster())).toBe(false);
    expect(await sink.emitMany([cluster('GOTHER'), cluster()])).toBe(1);
    expect(sink).toMatchObject({ emitted: 2, duplicates: 2 });

    const lines = (await readFile(join(dataDir, 'findings.jsonl'), 'utf8')).trim().split('\n');
    expect(lines).toHaveLength(2);

    const rerun = createFindingSink(dataDir);
    expect(await rerun.emit(cluster())).toBe(false);
  });

  it('serialises concurrent emits of the same finding', async () => {
    const storage = new JsonFileStorage(await mkdtemp(join(tmpdir(), 'harness-findings-')));
    const sink = createFindingSink(storage);
    const results = await Promise.all([sink.emit(cluster()), sink.emit(cluster())]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await storage.listFindings()).toHaveLength(1);
  });

  it('rejects invalid findings', async () => {
    const sink = createFindingSink(await mkdtemp(join(tmpdir(), 'harness-findings-')));
    await expect(sink.emit({ ...cluster(), findingId: 'nope' })).rejects.toThrow();
    expect(await sink.emit(cluster())).toBe(true);
  });
});
