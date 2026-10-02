import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadNetworkConfig } from '../../stellar';
import { readCensusRecords } from '../artifacts';
import type { ScanContext } from '../context';
import { filePersistence } from '../persistence';
import { githubCommand } from './github';

const context = async (env: Record<string, string> = {}) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harness-github-'));
  const lines: string[] = [];
  const ctx = {
    config: loadNetworkConfig({}),
    options: { dataDir, env },
    persistence: filePersistence(dataDir),
    log: (line: string) => lines.push(line),
  } as unknown as ScanContext;
  return { ctx, dataDir, lines };
};

describe('githubCommand', () => {
  it('skips without a token', async () => {
    const previous = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const { ctx, dataDir } = await context();
      await githubCommand(ctx);
      const [record] = await readCensusRecords(filePersistence(dataDir));
      expect(record?.run.skipped).toBe('GITHUB_TOKEN not set');
    } finally {
      if (previous !== undefined) process.env.GITHUB_TOKEN = previous;
    }
  });
});
