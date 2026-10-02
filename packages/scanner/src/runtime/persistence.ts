import { open, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import type { Network, Snapshot } from '@harness/schema';
import {
  type ArtifactKind,
  createScanStore,
  createSql,
  ensureMigrated,
  JsonFileStorage,
  PostgresStorage,
  type Storage,
} from '@harness/storage';
import { createDerivedWriter, derivedPath } from '../core/derived';
import { snapshotStore, writeJsonAtomic } from '../core/state';

export interface ScanPersistence {
  readonly kind: 'files' | 'postgres';
  readonly dataDir: string;
  readonly storage: Storage;
  getSnapshot(): Promise<Snapshot | null>;
  putSnapshot(snapshot: Snapshot): Promise<void>;
  resetForSnapshot(): Promise<void>;
  appendDerived(name: string, rows: unknown[]): Promise<void>;
  clearDerived(...names: string[]): Promise<void>;
  readDerived(name: string): AsyncIterable<unknown>;
  putArtifact(kind: ArtifactKind, name: string, body: unknown): Promise<void>;
  getArtifact(kind: ArtifactKind, name: string): Promise<unknown | null>;
  listArtifacts(kind: ArtifactKind): Promise<unknown[]>;
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

async function* readJsonlLines(path: string): AsyncIterable<unknown> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(path);
  } catch (error) {
    if (isMissing(error)) return;
    throw error;
  }
  try {
    for await (const line of handle.readLines()) if (line.trim()) yield JSON.parse(line);
  } finally {
    await handle.close();
  }
}

const artifactPath = (dataDir: string, kind: ArtifactKind, name: string): string =>
  kind === 'derived'
    ? join(dataDir, 'derived', `${name}.json`)
    : join(dataDir, kind === 'state' ? 'state' : join('derived', kind), `${name}.json`);

const readJson = async (path: string): Promise<unknown | null> => {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    if (isMissing(error)) return null;
    throw error;
  }
};

export const filePersistence = (dataDir: string): ScanPersistence => {
  const snapshots = snapshotStore(dataDir);
  return {
    kind: 'files',
    dataDir,
    storage: new JsonFileStorage(dataDir),
    getSnapshot: () => snapshots.read(),
    putSnapshot: (snapshot) => snapshots.write(snapshot),
    resetForSnapshot: async () => {
      await rm(join(dataDir, 'findings.jsonl'), { force: true });
      await rm(join(dataDir, 'derived'), { recursive: true, force: true });
      await rm(join(dataDir, 'state'), { recursive: true, force: true });
    },
    appendDerived: async (name, rows) => {
      const writer = createDerivedWriter(dataDir, name);
      await writer.writeMany(rows);
      await writer.close();
    },
    clearDerived: async (...names) => {
      await Promise.all(names.map((name) => rm(derivedPath(dataDir, name), { force: true })));
    },
    readDerived: (name) => readJsonlLines(derivedPath(dataDir, name)),
    putArtifact: (kind, name, body) => writeJsonAtomic(artifactPath(dataDir, kind, name), body),
    getArtifact: (kind, name) => readJson(artifactPath(dataDir, kind, name)),
    listArtifacts: async (kind) => {
      const dir = join(dataDir, 'derived', kind);
      try {
        const files = (await readdir(dir)).filter((file) => file.endsWith('.json')).sort();
        return Promise.all(files.map((file) => readJson(join(dir, file))));
      } catch (error) {
        if (isMissing(error)) return [];
        throw error;
      }
    },
  };
};

export const postgresPersistence = async (
  dataDir: string,
  network: Network,
  databaseUrl: string,
): Promise<ScanPersistence> => {
  const sql = createSql(databaseUrl);
  await ensureMigrated(sql);
  const store = createScanStore({ network, databaseUrl });
  if (!store) throw new Error('DATABASE_URL is set but the scan store could not be created');
  return {
    kind: 'postgres',
    dataDir,
    storage: new PostgresStorage(sql, network),
    getSnapshot: () => store.getSnapshot(),
    putSnapshot: (snapshot) => store.putSnapshot(snapshot),
    resetForSnapshot: () => store.resetForSnapshot(),
    appendDerived: async (name, rows) => {
      await store.appendDerived(name, rows);
    },
    clearDerived: (...names) => store.clearDerived(...names),
    readDerived: (name) => store.readDerived(name),
    putArtifact: (kind, name, body) => store.putArtifact(kind, name, body),
    getArtifact: (kind, name) => store.getArtifact(kind, name),
    listArtifacts: (kind) => store.listArtifacts(kind),
  };
};

export const createPersistence = (
  dataDir: string,
  network: Network,
  databaseUrl?: string,
): Promise<ScanPersistence> =>
  databaseUrl
    ? postgresPersistence(dataDir, network, databaseUrl)
    : Promise.resolve(filePersistence(dataDir));
