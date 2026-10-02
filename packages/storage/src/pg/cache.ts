import type { Network } from '@harness/schema';
import { z } from 'zod';
import type { Sql } from './sql';

export const HttpCacheEntry = z.object({
  fetchedAt: z.iso.datetime(),
  status: z.number().int(),
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});
export type HttpCacheEntry = z.infer<typeof HttpCacheEntry>;

export interface HttpCache {
  get(key: string): Promise<HttpCacheEntry | null>;
  set(key: string, entry: HttpCacheEntry): Promise<void>;
}

export const hostOfKey = (key: string): string => {
  const slash = key.indexOf('/');
  return slash > 0 ? key.slice(0, slash) : 'unknown';
};

export const isStorableEntry = (entry: HttpCacheEntry): boolean =>
  !entry.body.includes('\u0000') && !entry.url.includes('\u0000');

export const cacheRow = (network: string, key: string, entry: HttpCacheEntry) => ({
  network,
  key,
  host: hostOfKey(key),
  url: entry.url,
  fetched_at: entry.fetchedAt,
  status: entry.status,
  headers: entry.headers,
  body: entry.body,
});

export const CACHE_COLUMNS = [
  'network',
  'key',
  'host',
  'url',
  'fetched_at',
  'status',
  'headers',
  'body',
] as const;

type CacheRecord = {
  url: string;
  fetched_at: Date;
  status: number;
  headers: Record<string, string>;
  body: string;
};

export class PgCache implements HttpCache {
  readonly #sql: Sql;
  readonly network: Network;

  constructor(sql: Sql, network: Network) {
    this.#sql = sql;
    this.network = network;
  }

  async get(key: string): Promise<HttpCacheEntry | null> {
    const [row] = await this.#sql<CacheRecord[]>`
      select url, fetched_at, status, headers, body from http_cache
      where network = ${this.network} and key = ${key}
    `;
    if (!row) return null;
    return {
      fetchedAt: row.fetched_at.toISOString(),
      status: row.status,
      url: row.url,
      headers: row.headers,
      body: row.body,
    };
  }

  async set(key: string, entry: HttpCacheEntry): Promise<void> {
    if (!isStorableEntry(entry)) return;
    const row = cacheRow(this.network, key, entry);
    await this.#sql`
      insert into http_cache ${this.#sql(row, ...CACHE_COLUMNS)}
      on conflict (network, key) do update set
        host = excluded.host,
        url = excluded.url,
        fetched_at = excluded.fetched_at,
        status = excluded.status,
        headers = excluded.headers,
        body = excluded.body
    `;
  }
}
