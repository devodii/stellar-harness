import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { z } from 'zod';

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

export const readJson = async <T extends z.ZodType>(
  path: string,
  schema: T,
): Promise<z.infer<T> | null> => {
  try {
    return schema.parse(JSON.parse(await readFile(path, 'utf8')));
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
};

export const writeJson = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
};

export const readJsonl = async <T extends z.ZodType>(
  path: string,
  schema: T,
): Promise<z.infer<T>[]> => {
  try {
    const text = await readFile(path, 'utf8');
    return text
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => schema.parse(JSON.parse(line)));
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
};

export const appendJsonl = async (path: string, rows: unknown[]): Promise<void> => {
  if (rows.length === 0) return;
  await mkdir(dirname(path), { recursive: true });
  await appendFile(path, rows.map((row) => `${JSON.stringify(row)}\n`).join(''));
};
