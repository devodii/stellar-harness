import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { createChatModel, DEFAULT_MODELS } = await import('./model');

const env = (overrides: Record<string, unknown>) =>
  ({ apiKey: 'key', AI_PROVIDER: 'openai', AI_MODEL: undefined, ...overrides }) as Parameters<
    typeof createChatModel
  >[0];

describe('createChatModel', () => {
  it('defaults to the provider default model', () => {
    const model = createChatModel(env({}));
    expect(typeof model === 'object' && model.modelId).toBe(DEFAULT_MODELS.openai);
    expect(typeof model === 'object' && model.provider).toMatch(/^openai/);
  });

  it('switches provider and honours an explicit model', () => {
    const model = createChatModel(env({ AI_PROVIDER: 'anthropic', AI_MODEL: 'claude-opus-5-5' }));
    expect(typeof model === 'object' && model.modelId).toBe('claude-opus-5-5');
    expect(typeof model === 'object' && model.provider).toMatch(/^anthropic/);
  });
});
