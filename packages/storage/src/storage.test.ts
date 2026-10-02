import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emptySummary } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import {
  createCache,
  createScanStore,
  createStorage,
  JsonFileStorage,
  MemoryStorage,
  PgCache,
  PostgresStorage,
} from './index';
import { snapshot, storageContract } from './testing';

storageContract('MemoryStorage', async () => new MemoryStorage());
storageContract(
  'JsonFileStorage',
  async () => new JsonFileStorage(await mkdtemp(join(tmpdir(), 'harness-'))),
);

const DATABASE_URL = 'postgres://user:pass@127.0.0.1:1/none';

describe('createStorage', () => {
  it('falls back to memory without a data dir', () => {
    expect(createStorage()).toBeInstanceOf(MemoryStorage);
  });

  it('reads files from the network data dir', async () => {
    const base = join(await mkdtemp(join(tmpdir(), 'harness-')), 'data');
    await mkdir(`${base}-testnet`, { recursive: true });
    await writeFile(
      join(`${base}-testnet`, 'summary.json'),
      JSON.stringify(emptySummary({ ...snapshot, network: 'testnet' })),
    );
    expect(createStorage({ dataDir: base, network: 'testnet' })).toBeInstanceOf(JsonFileStorage);
    expect(createStorage({ dataDir: base, network: 'mainnet' })).toBeInstanceOf(MemoryStorage);
  });

  it('uses postgres when a database url is set', () => {
    const storage = createStorage({ dataDir: '/x', network: 'testnet', databaseUrl: DATABASE_URL });
    expect(storage).toBeInstanceOf(PostgresStorage);
    expect((storage as PostgresStorage).network).toBe('testnet');
  });
});

describe('createCache', () => {
  it('returns null without a database url so callers keep the disk cache', () => {
    expect(createCache({ dataDir: '/x', network: 'mainnet' })).toBeNull();
    expect(createScanStore({ network: 'mainnet' })).toBeNull();
  });

  it('returns a postgres cache keyed by network', () => {
    const cache = createCache({ dataDir: '/x', network: 'testnet', databaseUrl: DATABASE_URL });
    expect(cache).toBeInstanceOf(PgCache);
    expect((cache as PgCache).network).toBe('testnet');
  });
});
