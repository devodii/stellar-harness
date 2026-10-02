import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findWorkspaceRoot, resolveFrom } from './paths';

describe('findWorkspaceRoot', () => {
  it('walks up to the directory holding pnpm-workspace.yaml', async () => {
    const root = await mkdtemp(join(tmpdir(), 'harness-root-'));
    await writeFile(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
    const nested = join(root, 'apps', 'scan-cli');
    await mkdir(nested, { recursive: true });
    expect(findWorkspaceRoot(nested)).toBe(root);
  });

  it('resolves relative paths against the base and keeps absolute ones', () => {
    expect(resolveFrom('/repo', './data')).toBe('/repo/data');
    expect(resolveFrom('/repo', '/var/data')).toBe('/var/data');
  });
});
