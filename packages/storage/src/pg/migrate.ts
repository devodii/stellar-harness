import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { Sql } from './sql';

const MIGRATION_LOCK = 4_242_001;
const MIGRATION_FILE = /^\d{4}_[a-z0-9_]+\.sql$/;

export const defaultMigrationsDir = (): string => resolve(import.meta.dirname, '../../migrations');

export const pendingMigrations = (files: readonly string[], applied: ReadonlySet<string>) =>
  files
    .filter((file) => MIGRATION_FILE.test(file))
    .sort()
    .filter((file) => !applied.has(file));

export const migrate = async (sql: Sql, dir = defaultMigrationsDir()): Promise<string[]> => {
  const files = await readdir(dir);
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(${MIGRATION_LOCK})`;
    await tx`
      create table if not exists schema_migrations (
        name text primary key,
        applied_at timestamptz not null default now()
      )
    `;
    const rows = await tx<{ name: string }[]>`select name from schema_migrations`;
    const pending = pendingMigrations(files, new Set(rows.map((row) => row.name)));
    for (const file of pending) {
      await tx.unsafe(await readFile(join(dir, file), 'utf8'));
      await tx`insert into schema_migrations (name) values (${file})`;
    }
    return pending;
  });
};

const migrated = new WeakMap<Sql, Promise<string[]>>();

export const ensureMigrated = (sql: Sql): Promise<string[]> => {
  const existing = migrated.get(sql);
  if (existing) return existing;
  const running = migrate(sql).catch((error: unknown) => {
    migrated.delete(sql);
    throw error;
  });
  migrated.set(sql, running);
  return running;
};
