import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_NETWORK, type Network, Summary } from '@harness/schema';
import { JsonFileStorage } from './json-file';
import { MemoryStorage } from './memory';
import { dataDirFor } from './paths';
import { type HttpCache, PgCache } from './pg/cache';
import { PgScanStore } from './pg/scan-store';
import { createSql } from './pg/sql';
import { PostgresStorage } from './pg/storage';
import type { Storage } from './storage';

export type StorageOptions = { dataDir?: string; network?: Network; databaseUrl?: string };
export type CacheOptions = { dataDir: string; network: Network; databaseUrl?: string };

const readSeed = (dataDir: string): Summary | null => {
  const path = join(dataDir, 'seed', 'summary.sample.json');
  if (!existsSync(path)) return null;
  return Summary.parse(JSON.parse(readFileSync(path, 'utf8')));
};

export const createStorage = ({
  dataDir,
  network = DEFAULT_NETWORK,
  databaseUrl,
}: StorageOptions = {}): Storage => {
  if (databaseUrl) return new PostgresStorage(createSql(databaseUrl), network);
  const dir = dataDir ? dataDirFor(dataDir, network) : undefined;
  if (dir && existsSync(join(dir, 'summary.json'))) return new JsonFileStorage(dir);
  return new MemoryStorage({ summary: dir ? readSeed(dir) : null });
};

export const createCache = ({ network, databaseUrl }: CacheOptions): HttpCache | null =>
  databaseUrl ? new PgCache(createSql(databaseUrl), network) : null;

export const createScanStore = ({
  network,
  databaseUrl,
}: Omit<CacheOptions, 'dataDir'>): PgScanStore | null =>
  databaseUrl ? new PgScanStore(createSql(databaseUrl), network) : null;
