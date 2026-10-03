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
    select name, sha256, row_count, published_at from report_files order by name
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
  const lines = body.split(/\r?\n/).filter((line) => line.trim() !== '');
  return Math.max(lines.length - 1, 0);
};

const toReportFile = (name: string, body: string): Omit<ReportFile, 'publishedAt'> => ({
  name,
  body,
  sha256: sha256Hex(body),
  rowCount: countRows(name, body),
});

export const readReportDir = async (dir: string): Promise<Omit<ReportFile, 'publishedAt'>[]> => {
  const summary = toReportFile('summary.json', await readFile(join(dir, 'summary.json'), 'utf8'));
  const exportsDir = join(dir, 'exports');
  const csvNames = (await readdir(exportsDir).catch(() => [])).filter((name) =>
    name.endsWith('.csv'),
  );
  const csvs = await Promise.all(
    csvNames.map(async (name) => toReportFile(name, await readFile(join(exportsDir, name), 'utf8'))),
  );
  return [summary, ...csvs].sort((a, b) => a.name.localeCompare(b.name));
};
