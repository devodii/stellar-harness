import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSql, migrate, type Sql } from './pg';
import { addPilotRequest } from './pilot';

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('pilot requests in postgres', () => {
  let sql: Sql;
  const schema = `test_${Date.now()}`;

  beforeAll(async () => {
    const admin = createSql(url as string);
    await admin.unsafe(`create schema ${schema}`);
    await admin.end();
    sql = createSql(`${url}${url?.includes('?') ? '&' : '?'}options=-c%20search_path%3D${schema}`);
  });

  afterAll(async () => {
    await sql.unsafe(`drop schema ${schema} cascade`);
    await sql.end();
  });

  it('migrates once and counts requests', async () => {
    expect(await migrate(sql)).toEqual(['0001_pilot_requests']);
    expect(await migrate(sql)).toEqual([]);
    expect(await addPilotRequest(sql, { email: 'a@example.org', userAgent: 'test' })).toBe(1);
    expect(await addPilotRequest(sql, { email: 'b@example.org', userAgent: 'test' })).toBe(2);
  });
});
