import 'server-only';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createOpenAI } from '@ai-sdk/openai';
import type { LanguageModel } from 'ai';
import type { ChatEnv } from './env';

export const AI_PROVIDERS = ['openai', 'anthropic'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  openai: 'gpt-5.5',
  anthropic: 'claude-sonnet-5',
};

const PROVIDERS: Record<AiProvider, (apiKey: string, model: string) => LanguageModel> = {
  openai: (apiKey, model) => createOpenAI({ apiKey })(model),
  anthropic: (apiKey, model) => createAnthropic({ apiKey })(model),
};

export const createChatModel = (env: ChatEnv): LanguageModel =>
  PROVIDERS[env.AI_PROVIDER](env.apiKey, env.AI_MODEL ?? DEFAULT_MODELS[env.AI_PROVIDER]);
