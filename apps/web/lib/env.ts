import 'server-only';
import { resolve } from 'node:path';
import { defineEnv } from '@harness/schema';
import { z } from 'zod';
import { memo } from './memo';

const serverShape = {
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  HARNESS_DATA_DIR: z.string().min(1).default('../../data'),
  DATABASE_URL: z.string().min(1).optional(),
  AI_PROVIDER: z.enum(['openai', 'anthropic']).default('openai'),
  AI_MODEL: z.string().min(1).optional(),
};

const KEY_BY_PROVIDER = { openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' } as const;

export const getServerEnv = memo(() => {
  const env = defineEnv(serverShape);
  return { ...env, HARNESS_DATA_DIR: resolve(process.cwd(), env.HARNESS_DATA_DIR) };
});

export const getChatEnv = memo(() => {
  const env = getServerEnv();
  const keyName = KEY_BY_PROVIDER[env.AI_PROVIDER];
  const { [keyName]: apiKey } = defineEnv({
    [keyName]: z.string().min(1, `${keyName} is required for /api/chat`),
  });
  return { ...env, apiKey: apiKey as string };
});

export type ChatEnv = ReturnType<typeof getChatEnv>;
