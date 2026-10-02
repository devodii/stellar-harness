import { describe, expect, it } from 'vitest';
import { chatErrorMessage } from './chat-errors';

describe('chatErrorMessage', () => {
  it('unwraps an api error body', () => {
    const body = JSON.stringify({
      error: { code: 'INTERNAL', message: 'ANTHROPIC_API_KEY is required for /api/chat' },
    });
    expect(chatErrorMessage(new Error(body))).toBe(
      'INTERNAL: ANTHROPIC_API_KEY is required for /api/chat',
    );
  });

  it('falls back to the raw message', () => {
    expect(chatErrorMessage(new Error('network down'))).toBe('network down');
  });
});
