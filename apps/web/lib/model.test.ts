import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const { CHAT_MODEL, createChatModel } = await import('./model');

describe('createChatModel', () => {
  it('uses the openai chat model', () => {
    const model = createChatModel({ OPENAI_API_KEY: 'key' });
    expect(typeof model === 'object' && model.modelId).toBe(CHAT_MODEL);
    expect(typeof model === 'object' && model.provider).toMatch(/^openai/);
  });
});
