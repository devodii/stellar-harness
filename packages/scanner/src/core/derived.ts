import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { z } from 'zod';

export const derivedPath = (dataDir: string, name: string): string =>
  join(dataDir, 'derived', `${name}.jsonl`);

export const exportPath = (dataDir: string, name: string): string =>
  join(dataDir, 'exports', `${name}.csv`);

export type JsonlWriterOptions<T> = {
  batchSize?: number;
  mode?: 'append' | 'replace';
  schema?: z.ZodType<T>;
};

export type JsonlWriter<T> = {
  readonly path: string;
  readonly written: number;
  write(row: T): Promise<void>;
  writeMany(rows: Iterable<T>): Promise<void>;
  flush(): Promise<void>;
  close(): Promise<void>;
};

export const createJsonlWriter = <T>(
  path: string,
  { batchSize = 500, mode = 'append', schema }: JsonlWriterOptions<T> = {},
): JsonlWriter<T> => {
  let buffer: string[] = [];
  let written = 0;
  let prepared = false;
  let chain: Promise<void> = Promise.resolve();

  const prepare = async () => {
    if (prepared) return;
    await mkdir(dirname(path), { recursive: true });
    if (mode === 'replace') await writeFile(path, '');
    prepared = true;
  };

  const flush = (): Promise<void> => {
    const lines = buffer;
    buffer = [];
    chain = chain.then(async () => {
      await prepare();
      if (lines.length > 0) await appendFile(path, lines.join(''));
    });
    return chain;
  };

  const write = async (row: T): Promise<void> => {
    const valid = schema ? schema.parse(row) : row;
    buffer.push(`${JSON.stringify(valid)}\n`);
    written += 1;
    if (buffer.length >= batchSize) await flush();
  };

  return {
    path,
    get written() {
      return written;
    },
    write,
    async writeMany(rows) {
      for (const row of rows) await write(row);
    },
    flush,
    close: flush,
  };
};

export const createDerivedWriter = <T>(
  dataDir: string,
  name: string,
  options?: JsonlWriterOptions<T>,
): JsonlWriter<T> => createJsonlWriter(derivedPath(dataDir, name), options);

export type CsvColumn<T> = (keyof T & string) | { header: string; value: (row: T) => unknown };

const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(cellText).join(';');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

export const escapeCsv = (value: unknown): string => {
  const text = cellText(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = <T>(rows: Iterable<T>, columns: ReadonlyArray<CsvColumn<T>>): string => {
  const headers = columns.map((column) => (typeof column === 'string' ? column : column.header));
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(
      columns
        .map((column) => escapeCsv(typeof column === 'string' ? row[column] : column.value(row)))
        .join(','),
    );
  }
  return `${lines.join('\n')}\n`;
};

export const writeCsv = async <T>(
  path: string,
  rows: Iterable<T>,
  columns: ReadonlyArray<CsvColumn<T>>,
): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, toCsv(rows, columns));
};
