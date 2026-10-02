import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

export const CACHED_HEADERS = [
  'content-type',
  'access-control-allow-origin',
  'retry-after',
] as const;

export const CacheEntry = z.object({
  fetchedAt: z.iso.datetime(),
  status: z.number().int(),
  url: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.string(),
});
export type CacheEntry = z.infer<typeof CacheEntry>;

export type CacheKeyInput = { method: string; url: string; body?: string };

export interface Cache {
  get(key: string): Promise<CacheEntry | null>;
  set(key: string, entry: CacheEntry): Promise<void>;
}

const safeHost = (host: string): string => host.replace(/[^a-zA-Z0-9.-]/g, '_') || 'unknown';

export const cacheKey = ({ method, url, body = '' }: CacheKeyInput): string => {
  const hash = createHash('sha256')
    .update(`${method.toUpperCase()}\n${url}\n${body}`)
    .digest('hex');
  return `${safeHost(new URL(url).host)}/${hash}`;
};

export const pickCachedHeaders = (headers: Headers): Record<string, string> => {
  const picked: Record<string, string> = {};
  for (const name of CACHED_HEADERS) {
    const value = headers.get(name);
    if (value !== null) picked[name] = value;
  }
  return picked;
};

const CACHEABLE_CLIENT_ERRORS = new Set([404, 410]);

export const isCacheableStatus = (status: number): boolean =>
  (status >= 200 && status < 300) || CACHEABLE_CLIENT_ERRORS.has(status);

export class MemoryCache implements Cache {
  readonly entries = new Map<string, CacheEntry>();

  async get(key: string): Promise<CacheEntry | null> {
    return this.entries.get(key) ?? null;
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.entries.set(key, entry);
  }
}

export class NoCache implements Cache {
  async get(): Promise<CacheEntry | null> {
    return null;
  }

  async set(): Promise<void> {}
}

const isMissing = (error: unknown): boolean =>
  error instanceof Error && 'code' in error && error.code === 'ENOENT';

export class DiskCache implements Cache {
  readonly root: string;

  constructor(dataDir: string) {
    this.root = join(dataDir, 'cache');
  }

  pathFor(key: string): string {
    return join(this.root, `${key}.json`);
  }

  async get(key: string): Promise<CacheEntry | null> {
    try {
      const parsed = CacheEntry.safeParse(JSON.parse(await readFile(this.pathFor(key), 'utf8')));
      return parsed.success ? parsed.data : null;
    } catch (error) {
      if (isMissing(error) || error instanceof SyntaxError) return null;
      throw error;
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    const path = this.pathFor(key);
    await mkdir(dirname(path), { recursive: true });
    const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(temp, JSON.stringify(entry));
    await rename(temp, path);
  }
}
