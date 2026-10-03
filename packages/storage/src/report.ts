import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Sql } from './pg';

export type ReportFile = {
  name: string;
  body: string;
  sha256: string;
  rowCount: number;
  publishedAt: string;
};
export type ReportFileInfo = Omit<ReportFile, 'body'>;

type ReportFileRow = {
  name: string;
  body: string;
  sha256: string;
  row_count: number;
  published_at: Date;
};

const toInfo = (row: Omit<ReportFileRow, 'body'>): ReportFileInfo => ({
  name: row.name,
  sha256: row.sha256,
  rowCount: row.row_count,
  publishedAt: row.published_at.toISOString(),
});

export const publishReportFiles = async (
  sql: Sql,
  files: Omit<ReportFile, 'publishedAt'>[],
): Promise<void> => {
  const rows = files.map((file) => ({
    name: file.name,
    body: file.body,
    sha256: file.sha256,
    row_count: file.rowCount,
  }));
  await sql.begin(async (tx) => {
    await tx`delete from report_files`;
    if (rows.length > 0) await tx`insert into report_files ${tx(rows)}`;
  });
};

export const listReportFiles = async (sql: Sql): Promise<ReportFileInfo[]> => {
  const rows = await sql<Omit<ReportFileRow, 'body'>[]>`
    select name, sha256, row_count, published_at from report_files order by name collate "C"
  `;
  return rows.map(toInfo);
};

export const getReportFile = async (sql: Sql, name: string): Promise<ReportFile | null> => {
  const [row] = await sql<ReportFileRow[]>`
    select name, body, sha256, row_count, published_at from report_files where name = ${name}
  `;
  return row ? { ...toInfo(row), body: row.body } : null;
};

export const sha256Hex = (body: string): string =>
  createHash('sha256').update(body, 'utf8').digest('hex');

export const countRows = (name: string, body: string): number => {
  if (!name.endsWith('.csv')) return 1;
  let records = 0;
  let quoted = false;
  let filled = false;
  for (const char of body) {
    if (char === '"') quoted = !quoted;
    if (char === '\n' && !quoted) {
      if (filled) records++;
      filled = false;
    } else if (char !== '\r') filled = true;
  }
  if (filled) records++;
  return Math.max(records - 1, 0);
};

const toReportFile = (name: string, body: string): Omit<ReportFile, 'publishedAt'> => ({
  name,
  body,
  sha256: sha256Hex(body),
  rowCount: countRows(name, body),
});

const readDirFiles = async (
  dir: string,
  extension: string,
  rename: (name: string) => string = (name) => name,
): Promise<Omit<ReportFile, 'publishedAt'>[]> => {
  const names = (await readdir(dir).catch(() => [])).filter((name) => name.endsWith(extension));
  return Promise.all(
    names.map(async (name) => toReportFile(rename(name), await readFile(join(dir, name), 'utf8'))),
  );
};

export const readReportDir = async (dir: string): Promise<Omit<ReportFile, 'publishedAt'>[]> => {
  const summary = toReportFile('summary.json', await readFile(join(dir, 'summary.json'), 'utf8'));
  const csvs = await readDirFiles(join(dir, 'exports'), '.csv');
  const runs = await readDirFiles(join(dir, 'derived', 'runs'), '.json', (name) => `run_${name}`);
  return [summary, ...csvs, ...runs].sort((a, b) => (a.name < b.name ? -1 : 1));
};
