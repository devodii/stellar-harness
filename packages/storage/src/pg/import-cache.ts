import { opendir, readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Network } from '@harness/schema';
import { batched } from './batch';
import { CACHE_COLUMNS, cacheRow, HttpCacheEntry, isStorableEntry } from './cache';
import { emptyCounts, type ImportCounts, type ImportOptions, mapLimit } from './import-progress';
import type { Sql } from './sql';

const LOOKUP_BATCH = 500;
const INSERT_ROWS = 500;
const INSERT_BYTES = 16 * 1024 * 1024;
const READ_CONCURRENCY = 32;

type CacheFile = { key: string; path: string };

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

const listHosts = async (cacheDir: string): Promise<string[]> => {
  try {
    const entries = await readdir(cacheDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error) {
    if (isMissing(error)) return [];
    throw error;
  }
};

async function* cacheFiles(cacheDir: string, limit: number): AsyncIterable<CacheFile> {
  let seen = 0;
  for (const host of await listHosts(cacheDir)) {
    const dir = await opendir(join(cacheDir, host));
    for await (const entry of dir) {
      if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
      if (seen >= limit) return;
      seen += 1;
      yield {
        key: `${host}/${entry.name.slice(0, -'.json'.length)}`,
        path: join(dir.path, entry.name),
      };
    }
  }
}

const existingKeys = async (sql: Sql, network: Network, keys: string[]): Promise<Set<string>> => {
  const rows = await sql<{ key: string }[]>`
    select key from http_cache where network = ${network} and key = any(${keys}::text[])
  `;
  return new Set(rows.map((row) => row.key));
};

const readEntry = async (file: CacheFile) => {
  const text = await readFile(file.path, 'utf8');
  try {
    const parsed = HttpCacheEntry.safeParse(JSON.parse(text));
    return { file, bytes: text.length, entry: parsed.success ? parsed.data : null };
  } catch {
    return { file, bytes: text.length, entry: null };
  }
};

export const importCache = async (
  sql: Sql | null,
  network: Network,
  dataDir: string,
  { limit = Number.POSITIVE_INFINITY, dryRun = false, onProgress }: ImportOptions = {},
): Promise<ImportCounts> => {
  const counts = emptyCounts();
  const files = cacheFiles(join(dataDir, 'cache'), limit);
  for await (const lookup of batched(files, { maxRows: LOOKUP_BATCH })) {
    counts.scanned += lookup.length;
    const skip =
      sql && !dryRun
        ? await existingKeys(
            sql,
            network,
            lookup.map((file) => file.key),
          )
        : new Set<string>();
    counts.existing += skip.size;
    const fresh = lookup.filter((file) => !skip.has(file.key));
    const read = await mapLimit(fresh, READ_CONCURRENCY, readEntry);
    const rows = [];
    for (const { file, bytes, entry } of read) {
      counts.bytes += bytes;
      if (!entry || !isStorableEntry(entry)) counts.invalid += 1;
      else rows.push(cacheRow(network, file.key, entry));
    }
    if (sql && !dryRun) {
      for await (const batch of batched(rows, {
        maxRows: INSERT_ROWS,
        maxBytes: INSERT_BYTES,
        sizeOf: (row) => row.body.length,
      })) {
        const result = await sql`
          insert into http_cache ${sql(batch, ...CACHE_COLUMNS)}
          on conflict (network, key) do nothing
        `;
        counts.inserted += result.count;
      }
    }
    onProgress?.('cache', counts);
  }
  return counts;
};
