import { readdir, readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { type CsvColumn, exportPath, writeCsv } from '../core/derived';
import { writeJsonAtomic } from '../core/state';
import type { CensusRun, ExportPreview, MethodEntry } from '../report/inputs';

export const PREVIEW_LIMIT = 20;

const artifactsDir = (dataDir: string, kind: string) => join(dataDir, 'derived', kind);

const readJsonDir = async <T>(dir: string): Promise<T[]> => {
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
    return Promise.all(
      files.map(async (file) => JSON.parse(await readFile(join(dir, file), 'utf8')) as T),
    );
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
};

const csvHeader = <T>(column: CsvColumn<T>): string =>
  typeof column === 'string' ? column : column.header;

const csvValue = <T>(row: T, column: CsvColumn<T>): string | number | null => {
  const value = typeof column === 'string' ? row[column] : column.value(row);
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : String(value);
};

export const writeExport = async <T>(
  dataDir: string,
  name: string,
  rows: readonly T[],
  columns: ReadonlyArray<CsvColumn<T>>,
): Promise<ExportPreview> => {
  const path = exportPath(dataDir, name);
  await writeCsv(path, rows, columns);
  const preview: ExportPreview = {
    name,
    path: `${basename(dataDir)}/exports/${name}.csv`,
    columns: columns.map(csvHeader),
    rowCount: rows.length,
    rows: rows
      .slice(0, PREVIEW_LIMIT)
      .map((row) =>
        Object.fromEntries(columns.map((column) => [csvHeader(column), csvValue(row, column)])),
      ),
  };
  await writeJsonAtomic(join(artifactsDir(dataDir, 'previews'), `${name}.json`), preview);
  return preview;
};

export const readPreviews = (dataDir: string): Promise<ExportPreview[]> =>
  readJsonDir(artifactsDir(dataDir, 'previews'));

export type CensusRecord<TSummary> = {
  run: CensusRun;
  method: MethodEntry;
  summary: TSummary | null;
  stats: Record<string, unknown>;
};

export const writeCensusRecord = <TSummary>(
  dataDir: string,
  record: CensusRecord<TSummary>,
): Promise<void> =>
  writeJsonAtomic(join(artifactsDir(dataDir, 'runs'), `${record.run.census}.json`), record);

export const readCensusRecords = (dataDir: string): Promise<CensusRecord<unknown>[]> =>
  readJsonDir(artifactsDir(dataDir, 'runs'));
