import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createSql, migrate, type Sql } from './pg';
import {
  countRows,
  getReportFile,
  listReportFiles,
  publishReportFiles,
  readReportDir,
  sha256Hex,
} from './report';

describe('report files', () => {
  it('hashes utf8 bodies', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('counts csv rows without the header and blank lines', () => {
    expect(countRows('a.csv', 'h1,h2\n1,2\n\n3,4\n')).toBe(2);
    expect(countRows('a.csv', 'h1,h2\r\n1,2\r\n')).toBe(1);
    expect(countRows('a.csv', 'h1,h2\n')).toBe(0);
    expect(countRows('a.csv', '')).toBe(0);
    expect(countRows('a.csv', 'h1,h2\n"line one\nline two",2\n3,4')).toBe(2);
    expect(countRows('summary.json', '{"a":1}')).toBe(1);
  });

  it('reads summary.json, exported csvs and run records sorted by name', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'report-'));
    await mkdir(join(dir, 'exports'));
    await writeFile(join(dir, 'summary.json'), '{"ok":true}');
    await writeFile(join(dir, 'exports', 'b.csv'), 'x\n1\n2\n');
    await writeFile(join(dir, 'exports', 'a.csv'), 'x\n1\n');
    await writeFile(join(dir, 'exports', 'notes.txt'), 'skip');
    await mkdir(join(dir, 'derived', 'runs'), { recursive: true });
    await writeFile(join(dir, 'derived', 'runs', 'failures.json'), '{"census":"failures"}');
    const files = await readReportDir(dir);
    expect(files.map((file) => [file.name, file.rowCount])).toEqual([
      ['a.csv', 1],
      ['b.csv', 2],
      ['run_failures.json', 1],
      ['summary.json', 1],
    ]);
    expect(files[3]?.sha256).toBe(sha256Hex('{"ok":true}'));
    await rm(dir, { recursive: true });
  });

  it('reads a dir with only summary.json', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'report-'));
    await writeFile(join(dir, 'summary.json'), '{}');
    expect((await readReportDir(dir)).map((file) => file.name)).toEqual(['summary.json']);
    await rm(dir, { recursive: true });
  });

  it('throws when summary.json is missing', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'report-'));
    await expect(readReportDir(dir)).rejects.toThrow();
    await rm(dir, { recursive: true });
  });
});

const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)('report files in postgres', () => {
  let sql: Sql;
  const schema = `test_${Date.now()}`;
  const file = (name: string, body: string) => ({
    name,
    body,
    sha256: sha256Hex(body),
    rowCount: countRows(name, body),
  });

  beforeAll(async () => {
    const admin = createSql(url as string);
    await admin.unsafe(`create schema ${schema}`);
    await admin.end();
    sql = createSql(`${url}${url?.includes('?') ? '&' : '?'}options=-c%20search_path%3D${schema}`);
    await migrate(sql);
  });

  afterAll(async () => {
    await sql.unsafe(`drop schema ${schema} cascade`);
    await sql.end();
  });

  it('publishes, lists and gets files, replacing the set on republish', async () => {
    await publishReportFiles(sql, [file('summary.json', '{}'), file('a.csv', 'x\n1\n')]);
    const listed = await listReportFiles(sql);
    expect(listed.map((info) => [info.name, info.rowCount])).toEqual([
      ['a.csv', 1],
      ['summary.json', 1],
    ]);
    expect(listed[0]).not.toHaveProperty('body');
    expect(Number.isNaN(Date.parse(listed[0]?.publishedAt ?? ''))).toBe(false);
    expect(await getReportFile(sql, 'a.csv')).toMatchObject({ body: 'x\n1\n', rowCount: 1 });
    expect(await getReportFile(sql, 'missing.csv')).toBeNull();

    await publishReportFiles(sql, [file('summary.json', '{"v":2}')]);
    expect((await listReportFiles(sql)).map((info) => info.name)).toEqual(['summary.json']);
    expect(await getReportFile(sql, 'a.csv')).toBeNull();
    expect((await getReportFile(sql, 'summary.json'))?.body).toBe('{"v":2}');
  });
});
