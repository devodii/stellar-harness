import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const loadDotEnv = (path = resolve(import.meta.dirname, '..', '.env')): void => {
  if (existsSync(path)) process.loadEnvFile(path);
};
