import { randomBytes } from 'node:crypto';
import postgres from 'postgres';
import { migrate } from './migrate';
import type { Sql } from './sql';

export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL;

export type TestDatabase = { sql: Sql; truncate: () => Promise<void>; drop: () => Promise<void> };

export const createTestDatabase = async (url: string): Promise<TestDatabase> => {
  const schema = `harness_test_${randomBytes(4).toString('hex')}`;
  const admin = postgres(url, { max: 1, onnotice: () => {} });
  await admin`create schema ${admin(schema)}`;
  const sql = postgres(url, { max: 4, onnotice: () => {}, connection: { search_path: schema } });
  await migrate(sql);
  return {
    sql,
    truncate: async () => {
      await sql`truncate findings, summaries, snapshots, derived_rows, artifacts, http_cache`;
    },
    drop: async () => {
      await sql.end();
      await admin`drop schema if exists ${admin(schema)} cascade`;
      await admin.end();
    },
  };
};
