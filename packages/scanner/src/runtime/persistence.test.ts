import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { filePersistence } from './persistence';

const snapshot = {
  snapshotLedger: 10,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5,
  gitSha: 'abc',
  network: 'mainnet' as const,
};

const collect = async (rows: AsyncIterable<unknown>) => {
  const out: unknown[] = [];
  for await (const row of rows) out.push(row);
  return out;
};

describe('filePersistence', () => {
  it('appends, reads and clears derived rows', async () => {
    const persistence = filePersistence(await mkdtemp(join(tmpdir(), 'harness-persist-')));
    await persistence.appendDerived('rows', [{ a: 1 }]);
    await persistence.appendDerived('rows', [{ a: 2 }]);
    expect(await collect(persistence.readDerived('rows'))).toEqual([{ a: 1 }, { a: 2 }]);
    await persistence.clearDerived('rows');
    expect(await collect(persistence.readDerived('rows'))).toEqual([]);
  });

  it('stores artifacts by kind and resets for a new snapshot', async () => {
    const persistence = filePersistence(await mkdtemp(join(tmpdir(), 'harness-persist-')));
    await persistence.putSnapshot(snapshot);
    await persistence.putArtifact('derived', 'anchor_domains', [{ domain: 'a.example' }]);
    await persistence.putArtifact('runs', 'rent', { run: { census: 'rent' } });
    expect(await persistence.getArtifact('derived', 'anchor_domains')).toEqual([
      { domain: 'a.example' },
    ]);
    expect(await persistence.listArtifacts('runs')).toEqual([{ run: { census: 'rent' } }]);
    expect(await persistence.getSnapshot()).toEqual(snapshot);
    await persistence.resetForSnapshot();
    expect(await persistence.listArtifacts('runs')).toEqual([]);
  });
});
