import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Summary } from '@harness/schema';
import { JsonFileStorage } from './json-file';
import { MemoryStorage } from './memory';
import type { Storage } from './storage';

export type StorageOptions = { dataDir?: string };

const readSeed = (dataDir: string): Summary | null => {
  const path = join(dataDir, 'seed', 'summary.sample.json');
  if (!existsSync(path)) return null;
  return Summary.parse(JSON.parse(readFileSync(path, 'utf8')));
};

export const createStorage = ({ dataDir }: StorageOptions = {}): Storage => {
  if (dataDir && existsSync(join(dataDir, 'summary.json'))) return new JsonFileStorage(dataDir);
  return new MemoryStorage({ summary: dataDir ? readSeed(dataDir) : null });
};
