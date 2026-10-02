import 'server-only';
import { resolve } from 'node:path';
import { defineEnv, envUrl } from '@harness/schema';
import { z } from 'zod';
import { memo } from './memo';

const serverShape = {
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HORIZON_URL: envUrl('https://horizon.stellar.org'),
  HARNESS_DATA_DIR: z.string().min(1).default('../../data'),
  AI_MODEL: z.string().min(1).default('claude-sonnet-5'),
  DATABASE_URL: z.string().min(1).optional(),
};

const chatShape = {
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required for /api/chat'),
};

export const getServerEnv = memo(() => {
  const env = defineEnv(serverShape);
  return { ...env, HARNESS_DATA_DIR: resolve(process.cwd(), env.HARNESS_DATA_DIR) };
});

export const getChatEnv = memo(() => ({ ...getServerEnv(), ...defineEnv(chatShape) }));
