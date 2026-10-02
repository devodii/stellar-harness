import postgres from 'postgres';

export type Sql = postgres.Sql;

export const POOL_MAX = 10;

const pools = new Map<string, Sql>();

export const createSql = (databaseUrl: string): Sql => {
  const existing = pools.get(databaseUrl);
  if (existing) return existing;
  const sql = postgres(databaseUrl, {
    max: POOL_MAX,
    idle_timeout: 30,
    connect_timeout: 10,
    onnotice: () => {},
  });
  pools.set(databaseUrl, sql);
  return sql;
};

export const closeSql = async (databaseUrl: string): Promise<void> => {
  const sql = pools.get(databaseUrl);
  if (!sql) return;
  pools.delete(databaseUrl);
  await sql.end();
};

const ESCAPED_NUL_SOURCE = String.raw`(?<!\\)((?:\\\\)*)\\u0000`;
const HAS_ESCAPED_NUL = new RegExp(ESCAPED_NUL_SOURCE);
const ESCAPED_NUL = new RegExp(ESCAPED_NUL_SOURCE, 'g');

export const withoutNul = (value: unknown): unknown => {
  const text = JSON.stringify(value);
  return HAS_ESCAPED_NUL.test(text) ? JSON.parse(text.replace(ESCAPED_NUL, '$1\\ufffd')) : value;
};

export const toJson = (value: unknown): postgres.JSONValue =>
  withoutNul(value) as postgres.JSONValue;
