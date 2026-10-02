import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptySummary } from '@harness/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { finding, snapshot } from '../testing';
import { PgCache } from './cache';
import { importCache } from './import-cache';
import { importDerived, importFindings, importState, importSummary } from './import-files';
import { PgScanStore } from './scan-store';
import { PostgresStorage } from './storage';
import { createTestDatabase, TEST_DATABASE_URL, type TestDatabase } from './test-db';

const entry = (n: number) => ({
  fetchedAt: '2026-10-02T00:00:00.000Z',
  status: 200,
  url: `https://horizon.stellar.org/ledgers/${n}`,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ sequence: n }),
});

const put = async (dir: string, path: string, content: string) => {
  await mkdir(join(dir, path, '..'), { recursive: true });
  await writeFile(join(dir, path), content);
};

const fingerprint = async (dir: string): Promise<string> => {
  const hash = createHash('sha256');
  const entries = await readdir(dir, { recursive: true, withFileTypes: true });
  for (const item of entries
    .filter((e) => e.isFile())
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const path = join(item.parentPath, item.name);
    hash
      .update(path)
      .update(await readFile(path))
      .update(String((await stat(path)).mtimeMs));
  }
  return hash.digest('hex');
};

const buildDataDir = async (): Promise<string> => {
  const dir = await mkdtemp(join(tmpdir(), 'harness-import-'));
  for (let n = 0; n < 7; n += 1) {
    await put(
      dir,
      `cache/horizon.stellar.org/${n.toString().padStart(4, '0')}.json`,
      JSON.stringify(entry(n)),
    );
  }
  await put(dir, 'cache/rpc.example/bad.json', '{not json');
  await put(dir, 'cache/rpc.example/nul.json', JSON.stringify({ ...entry(9), body: 'a\u0000' }));
  await put(dir, 'cache/rpc.example/skip.json.123.tmp', '{}');
  const findings = [finding(1), finding(2, { severity: 'low' }), finding(3)];
  await put(
    dir,
    'findings.jsonl',
    `${findings.map((f) => JSON.stringify(f)).join('\n')}\n{"bad":1}\n`,
  );
  await put(dir, 'summary.json', JSON.stringify(emptySummary(snapshot)));
  await put(
    dir,
    'state/snapshot.json',
    JSON.stringify({ name: 'snapshot', savedAt: snapshot.snapshotTime, state: snapshot }),
  );
  await put(
    dir,
    'state/anchors.json',
    JSON.stringify({ name: 'anchors', savedAt: snapshot.snapshotTime, state: { done: 3 } }),
  );
  await put(
    dir,
    'derived/failed_tx.jsonl',
    [1, 2, 3, 4, 5].map((n) => JSON.stringify({ n })).join('\n'),
  );
  await put(dir, 'derived/previews/failures.json', JSON.stringify({ name: 'failures' }));
  await put(dir, 'derived/runs/failures.json', JSON.stringify({ run: { census: 'failures' } }));
  await put(
    dir,
    'derived/anchor_tests/tender.cash.json',
    JSON.stringify({ domain: 'tender.cash' }),
  );
  await put(dir, 'derived/anchor_domains.json', JSON.stringify(['a.io']));
  return dir;
};

describe.skipIf(!TEST_DATABASE_URL)('import from a data dir', () => {
  let db: TestDatabase;
  let dir: string;

  beforeAll(async () => {
    db = await createTestDatabase(TEST_DATABASE_URL ?? '');
    dir = await buildDataDir();
  });

  afterAll(() => db.drop());

  it('imports everything once, resumes without duplicates and never touches files', async () => {
    const before = await fingerprint(dir);
    const { sql } = db;

    const limited = await importCache(sql, 'mainnet', dir, { limit: 3 });
    expect(limited).toMatchObject({ scanned: 3, inserted: 3 });
    const cache = await importCache(sql, 'mainnet', dir);
    expect(cache).toMatchObject({ scanned: 9, inserted: 4, existing: 3, invalid: 2 });
    expect(await new PgCache(sql, 'mainnet').get('horizon.stellar.org/0003')).toEqual(entry(3));

    expect(await importFindings(sql, 'mainnet', dir)).toMatchObject({ inserted: 3, invalid: 1 });
    expect(await importFindings(sql, 'mainnet', dir)).toMatchObject({ inserted: 0, existing: 3 });
    expect(await importSummary(sql, 'mainnet', dir)).toMatchObject({ inserted: 1 });
    expect(await importState(sql, 'mainnet', dir)).toMatchObject({ inserted: 2 });

    const partial = await importDerived(sql, 'mainnet', dir, { limit: 2 });
    expect(partial.rows).toMatchObject({ inserted: 2 });
    const derived = await importDerived(sql, 'mainnet', dir);
    expect(derived.rows).toMatchObject({ scanned: 5, existing: 2, inserted: 3 });
    expect(derived.artifacts).toMatchObject({ inserted: 4 });

    const storage = new PostgresStorage(sql, 'mainnet');
    expect((await storage.queryFindings({})).total).toBe(3);
    expect((await storage.getSnapshot())?.snapshotLedger).toBe(100);

    const store = new PgScanStore(sql, 'mainnet');
    expect((await store.getSnapshot())?.snapshotLedger).toBe(100);
    const rows: unknown[] = [];
    for await (const row of store.readDerived('failed_tx')) rows.push(row);
    expect(rows).toEqual([1, 2, 3, 4, 5].map((n) => ({ n })));
    expect(await store.listArtifacts('previews')).toEqual([{ name: 'failures' }]);
    expect(await store.getArtifact('derived', 'anchor_tests/tender.cash')).toEqual({
      domain: 'tender.cash',
    });
    expect(await store.getArtifact('state', 'anchors')).toMatchObject({ state: { done: 3 } });

    expect(await fingerprint(dir)).toBe(before);
  });

  it('writes nothing on a dry run', async () => {
    await db.truncate();
    const counts = await importCache(db.sql, 'testnet', dir, { dryRun: true });
    expect(counts).toMatchObject({ scanned: 9, inserted: 0, invalid: 2 });
    const [row] = await db.sql<{ n: number }[]>`select count(*)::int as n from http_cache`;
    expect(row?.n).toBe(0);
  });
});
