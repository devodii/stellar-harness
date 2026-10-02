import { existsSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';

export const findWorkspaceRoot = (start: string): string => {
  let dir = resolve(start);
  while (!existsSync(join(dir, 'pnpm-workspace.yaml'))) {
    const parent = dirname(dir);
    if (parent === dir) return resolve(start);
    dir = parent;
  }
  return dir;
};

export const resolveFrom = (base: string, path: string): string =>
  isAbsolute(path) ? path : resolve(base, path);
