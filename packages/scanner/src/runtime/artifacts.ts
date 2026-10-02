import { basename } from 'node:path';
import { type CsvColumn, exportPath, writeCsv } from '../core/derived';
import type { CensusRun, ExportPreview, MethodEntry } from '../report/inputs';
import type { ScanPersistence } from './persistence';

export const PREVIEW_LIMIT = 20;

const csvHeader = <T>(column: CsvColumn<T>): string =>
  typeof column === 'string' ? column : column.header;

const csvValue = <T>(row: T, column: CsvColumn<T>): string | number | null => {
  const value = typeof column === 'string' ? row[column] : column.value(row);
  if (value === null || value === undefined) return null;
  return typeof value === 'number' ? value : String(value);
};

export const writeExport = async <T>(
  persistence: ScanPersistence,
  name: string,
  rows: readonly T[],
  columns: ReadonlyArray<CsvColumn<T>>,
): Promise<ExportPreview> => {
  const { dataDir } = persistence;
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
  await persistence.putArtifact('previews', name, preview);
  return preview;
};

export const readPreviews = async (persistence: ScanPersistence): Promise<ExportPreview[]> =>
  (await persistence.listArtifacts('previews')) as ExportPreview[];

export type CensusRecord<TSummary> = {
  run: CensusRun;
  method: MethodEntry;
  summary: TSummary | null;
  stats: Record<string, unknown>;
};

export const writeCensusRecord = <TSummary>(
  persistence: ScanPersistence,
  record: CensusRecord<TSummary>,
): Promise<void> => persistence.putArtifact('runs', record.run.census, record);

export const readCensusRecords = async (
  persistence: ScanPersistence,
): Promise<CensusRecord<unknown>[]> =>
  (await persistence.listArtifacts('runs')) as CensusRecord<unknown>[];
