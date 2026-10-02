import { emptySummary, type Finding } from '@harness/schema';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { queryFindingRows } from '../query';
import { finding, snapshot, storageContract } from '../testing';
import { PgCache } from './cache';
import { migrate } from './migrate';
import { PgScanStore } from './scan-store';
import type { Sql } from './sql';
import { PostgresStorage } from './storage';
import { createTestDatabase, TEST_DATABASE_URL, type TestDatabase } from './test-db';

describe.skipIf(!TEST_DATABASE_URL)('postgres', () => {
  let db: TestDatabase;
  let sql: Sql;
  const truncate = () => db.truncate();

  beforeAll(async () => {
    db = await createTestDatabase(TEST_DATABASE_URL ?? '');
    sql = db.sql;
  });

  afterAll(() => db.drop());

  it('applies migrations once', async () => {
    expect(await migrate(sql)).toEqual([]);
    const rows = await sql<{ name: string }[]>`select name from schema_migrations`;
    expect(rows.map((row) => row.name)).toContain('0001_init.sql');
  });

  storageContract('PostgresStorage', async () => {
    await truncate();
    return new PostgresStorage(sql, 'mainnet');
  });

  it('matches the in-memory ordering, filters and pagination', async () => {
    await truncate();
    const severities = ['info', 'critical', 'low', 'high', 'medium'] as const;
    const subjects = ['beta.io', 'Alpha.io', 'alpha.io', 'GZ', 'Ga', 'C1', 'c2', 'zeta', '_x'];
    const rows: Finding[] = Array.from({ length: 60 }, (_, n) =>
      finding(n + 1, {
        severity: severities[n % severities.length],
        subject: `${subjects[n % subjects.length]}${n % 4}`,
        tags: n % 3 === 0 ? ['anchor', 'scf'] : ['anchor'],
        type: n % 2 === 0 ? 'OP_NO_TRUST_CLUSTER' : 'ANCHOR_SEP10_CHALLENGE_FAILS',
      }),
    );
    const storage = new PostgresStorage(sql, 'mainnet');
    await storage.putFindings(rows);
    const queries = [
      {},
      { limit: 7, offset: 5 },
      { severity: ['high' as const, 'low' as const] },
      { tags: ['scf'] },
      { type: ['ANCHOR_SEP10_CHALLENGE_FAILS' as const], tags: ['anchor'], limit: 3 },
      { subject: 'GZ3' },
      { offset: 100 },
    ];
    for (const query of queries) {
      const expected = queryFindingRows(rows, query);
      const actual = await storage.queryFindings(query);
      expect(actual.total).toBe(expected.total);
      expect(actual.rows.map((row) => row.findingId)).toEqual(
        expected.rows.map((row) => row.findingId),
      );
    }
  });

  it('keeps networks apart', async () => {
    await truncate();
    const mainnet = new PostgresStorage(sql, 'mainnet');
    const testnet = new PostgresStorage(sql, 'testnet');
    await mainnet.putFindings([finding(1)]);
    await testnet.putSummary(emptySummary({ ...snapshot, network: 'testnet' }));
    expect((await testnet.queryFindings({})).total).toBe(0);
    expect(await mainnet.getSummary()).toBeNull();
    expect((await testnet.getSnapshot())?.network).toBe('testnet');
  });

  it('round trips cache entries per network', async () => {
    await truncate();
    const cache = new PgCache(sql, 'mainnet');
    const entry = {
      fetchedAt: '2026-10-02T01:02:03.456Z',
      status: 404,
      url: 'https://horizon.stellar.org/accounts/G',
      headers: { 'content-type': 'application/json' },
      body: '{"status":404}',
    };
    await cache.set('horizon.stellar.org/abc', entry);
    expect(await cache.get('horizon.stellar.org/abc')).toEqual(entry);
    expect(await new PgCache(sql, 'testnet').get('horizon.stellar.org/abc')).toBeNull();
    await cache.set('horizon.stellar.org/abc', { ...entry, status: 200 });
    expect((await cache.get('horizon.stellar.org/abc'))?.status).toBe(200);
    await cache.set('horizon.stellar.org/nul', { ...entry, body: 'a\u0000' });
    expect(await cache.get('horizon.stellar.org/nul')).toBeNull();
  });

  it('stores derived rows, artifacts and snapshots for the scanner', async () => {
    await truncate();
    const store = new PgScanStore(sql, 'testnet');
    async function* rows() {
      for (let n = 0; n < 2500; n += 1) yield { n, memo: n === 3 ? 'a\u0000' : 'x' };
    }
    expect(await store.appendDerived('failed_tx', rows())).toBe(2500);
    await store.appendDerived('failed_tx', [{ n: 2500 }]);
    const seen: unknown[] = [];
    for await (const row of store.readDerived('failed_tx')) seen.push(row);
    expect(seen).toHaveLength(2501);
    expect(seen[3]).toEqual({ n: 3, memo: 'a�' });
    expect(seen[2500]).toEqual({ n: 2500 });

    await store.putArtifact('previews', 'b', { name: 'b' });
    await store.putArtifact('previews', 'a', { name: 'a' });
    await store.putArtifact('previews', 'a', { name: 'a', v: 2 });
    expect(await store.listArtifacts('previews')).toEqual([{ name: 'a', v: 2 }, { name: 'b' }]);

    await store.putSnapshot({ ...snapshot, network: 'testnet' });
    expect((await store.getSnapshot())?.network).toBe('testnet');

    await store.resetForSnapshot();
    expect(await store.listArtifacts('previews')).toEqual([]);
    await store.clearDerived('failed_tx');
    const after: unknown[] = [];
    for await (const row of store.readDerived('failed_tx')) after.push(row);
    expect(after).toEqual([]);
  });
});
