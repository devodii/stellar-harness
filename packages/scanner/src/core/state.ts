import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';
import { Snapshot } from '../schema';

export const statePath = (dataDir: string, name: string): string =>
  join(dataDir, 'state', `${name}.json`);

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

export const writeJsonAtomic = async (path: string, value: unknown): Promise<void> => {
  await mkdir(dirname(path), { recursive: true });
  const temp = `${path}.${process.pid}.tmp`;
  await writeFile(temp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temp, path);
};

export type StateStore<T> = {
  readonly path: string;
  read(): Promise<T | null>;
  write(state: T): Promise<void>;
};

export const createStateStore = <S extends z.ZodType>(
  dataDir: string,
  name: string,
  schema: S,
  now: () => Date = () => new Date(),
): StateStore<z.infer<S>> => {
  const path = statePath(dataDir, name);
  const envelope = z.object({
    name: z.literal(name),
    savedAt: z.iso.datetime(),
    state: z.unknown(),
  });
  return {
    path,
    async read() {
      try {
        return schema.parse(envelope.parse(JSON.parse(await readFile(path, 'utf8'))).state);
      } catch (error) {
        if (isMissing(error)) return null;
        throw error;
      }
    },
    async write(state) {
      await writeJsonAtomic(path, {
        name,
        savedAt: now().toISOString(),
        state: schema.parse(state),
      });
    },
  };
};

export const snapshotStore = (dataDir: string): StateStore<Snapshot> =>
  createStateStore(dataDir, 'snapshot', Snapshot);
