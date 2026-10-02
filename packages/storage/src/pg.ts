import postgres from 'postgres';
import { MIGRATIONS, type Migration } from './migrations';

export type Sql = postgres.Sql;

export const createSql = (url: string): Sql => postgres(url, { max: 5, idle_timeout: 20 });

export const migrate = async (
  sql: Sql,
  migrations: Migration[] = MIGRATIONS,
): Promise<string[]> => {
  await sql`create table if not exists app_migrations (id text primary key, applied_at timestamptz not null default now())`;
  const applied = new Set(
    (await sql<{ id: string }[]>`select id from app_migrations`).map((row) => row.id),
  );
  const pending = migrations.filter((migration) => !applied.has(migration.id));
  for (const migration of pending) {
    await sql.begin(async (tx) => {
      await tx.unsafe(migration.sql);
      await tx`insert into app_migrations (id) values (${migration.id})`;
    });
  }
  return pending.map((migration) => migration.id);
};
