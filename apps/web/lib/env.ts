import 'server-only';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineEnv } from '@harness/schema';
import { z } from 'zod';
import { memo } from './memo';

const serverShape = {
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HARNESS_DATA_DIR: z.string().min(1).default('../../data'),
  DATABASE_URL: z.string().min(1).optional(),
};

const chatShape = {
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required for /api/chat'),
};

const loadRootEnv = memo(() => {
  const rootEnv = resolve(process.cwd(), '../../.env');
  if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);
});

export const getServerEnv = memo(() => {
  loadRootEnv();
  const env = defineEnv(serverShape);
  return { ...env, HARNESS_DATA_DIR: resolve(process.cwd(), env.HARNESS_DATA_DIR) };
});

export const getChatEnv = memo(() => ({ ...getServerEnv(), ...defineEnv(chatShape) }));

export type ChatEnv = ReturnType<typeof getChatEnv>;
