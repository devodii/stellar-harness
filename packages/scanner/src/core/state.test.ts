import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createStateStore, snapshotStore, statePath } from './state';

const Cursor = z.object({ cursor: z.string(), lastLedger: z.number().int() });
const tempDir = () => mkdtemp(join(tmpdir(), 'harness-state-'));

describe('state store', () => {
  it('writes data/state/<census>.json and reads it back', async () => {
    const dataDir = await tempDir();
    const store = createStateStore(dataDir, 'failures', Cursor, () => new Date(0));
    expect(store.path).toBe(statePath(dataDir, 'failures'));
    expect(await store.read()).toBeNull();
    await store.write({ cursor: 'abc', lastLedger: 7 });
    expect(await store.read()).toEqual({ cursor: 'abc', lastLedger: 7 });
    expect(JSON.parse(await readFile(store.path, 'utf8'))).toEqual({
      name: 'failures',
      savedAt: '1970-01-01T00:00:00.000Z',
      state: { cursor: 'abc', lastLedger: 7 },
    });
  });

  it('refuses to write state that fails the schema', async () => {
    const store = createStateStore(await tempDir(), 'failures', Cursor);
    await expect(store.write({ cursor: 1 } as never)).rejects.toThrow();
  });

  it('rejects a state file written by a different census', async () => {
    const dataDir = await tempDir();
    await createStateStore(dataDir, 'anchors', Cursor).write({ cursor: 'a', lastLedger: 1 });
    await writeFile(
      statePath(dataDir, 'failures'),
      await readFile(statePath(dataDir, 'anchors'), 'utf8'),
    );
    await expect(createStateStore(dataDir, 'failures', Cursor).read()).rejects.toThrow();
  });

  it('persists the run snapshot', async () => {
    const store = snapshotStore(await tempDir());
    const snapshot = {
      snapshotLedger: 64722901,
      snapshotTime: '2026-10-02T00:18:07.000Z',
      ledgerCloseSeconds: 5,
      gitSha: 'abc',
      network: 'mainnet' as const,
    };
    await store.write(snapshot);
    expect(await store.read()).toEqual(snapshot);
    expect(store.path.endsWith(join('state', 'snapshot.json'))).toBe(true);
  });
});
