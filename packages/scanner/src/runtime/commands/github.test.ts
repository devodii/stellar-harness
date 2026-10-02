import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadNetworkConfig } from '@harness/stellar-tools';
import { describe, expect, it } from 'vitest';
import { readCensusRecords } from '../artifacts';
import type { ScanContext } from '../context';
import { GITHUB_NETWORK_SKIP, githubCommand } from './github';

const context = async (network: 'mainnet' | 'testnet', env: Record<string, string> = {}) => {
  const dataDir = await mkdtemp(join(tmpdir(), 'harness-github-'));
  const lines: string[] = [];
  const ctx = {
    config: loadNetworkConfig({}, network),
    options: { dataDir, env },
    log: (line: string) => lines.push(line),
  } as unknown as ScanContext;
  return { ctx, dataDir, lines };
};

describe('githubCommand', () => {
  it('skips off mainnet even with a token and records why', async () => {
    const { ctx, dataDir } = await context('testnet', { GITHUB_TOKEN: 'token' });
    expect(await githubCommand(ctx)).toEqual({ run: null, findings: 0 });
    const [record] = await readCensusRecords(dataDir);
    expect(record?.run.skipped).toBe(GITHUB_NETWORK_SKIP);
    expect(record?.method.notes).toEqual([`Skipped: ${GITHUB_NETWORK_SKIP}.`]);
    expect(record?.method.parameters).toEqual({ network: 'testnet' });
  });

  it('still skips mainnet without a token', async () => {
    const previous = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const { ctx, dataDir } = await context('mainnet');
      await githubCommand(ctx);
      const [record] = await readCensusRecords(dataDir);
      expect(record?.run.skipped).toBe('GITHUB_TOKEN not set');
    } finally {
      if (previous !== undefined) process.env.GITHUB_TOKEN = previous;
    }
  });
});
