import { describe, expect, it } from 'vitest';
import { firstUserText, type HarnessUIMessage, messageText, withKnownDataParts } from './chat';

const user = (text: string): HarnessUIMessage => ({
  id: text,
  role: 'user',
  parts: [{ type: 'text', text }],
});

describe('chat helpers', () => {
  it('reads the first text part', () => {
    expect(firstUserText(user('What is archived?'))).toBe('What is archived?');
    expect(firstUserText(undefined)).toBeNull();
  });

  it('joins the text parts of a message', () => {
    const message: HarnessUIMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'First line.' },
        { type: 'reasoning', text: 'hidden' },
        { type: 'text', text: 'Second line.' },
      ],
    };
    expect(messageText(message)).toBe('First line.\nSecond line.');
  });

  it('drops stored data parts the chat no longer understands', () => {
    const stored = {
      id: 'u1',
      role: 'user',
      parts: [
        { type: 'text', text: 'hello' },
        { type: 'data-retired', data: { planId: 'p1' } },
        { type: 'data-context', data: { kind: 'reply', messageId: 'a1', excerpt: 'hi' } },
      ],
    };
    expect(withKnownDataParts(stored).parts.map((part) => part.type)).toEqual([
      'text',
      'data-context',
    ]);
  });
});
