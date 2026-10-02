import { describe, expect, it } from 'vitest';
import type { HarnessUIMessage } from './chat';
import {
  conversationTitle,
  MAX_CONVERSATIONS,
  newConversation,
  removeConversation,
  sameMessages,
  sanitizeConversations,
  UNTITLED,
  upsertConversation,
  withMessages,
} from './conversations';

const user = (text: string): HarnessUIMessage => ({
  id: text,
  role: 'user',
  parts: [{ type: 'text', text }],
});

describe('conversations', () => {
  it('titles a conversation from its first user message', () => {
    expect(conversationTitle([])).toBe(UNTITLED);
    expect(conversationTitle([user('Check mykobo.co')])).toBe('Check mykobo.co');
    expect(conversationTitle([user('x'.repeat(100))])).toHaveLength(60);
  });

  it('keeps the newest conversation first and caps the list', () => {
    const at = (n: number) => new Date(Date.UTC(2026, 0, 1, 0, n));
    let list = Array.from({ length: MAX_CONVERSATIONS }, (_, n) => newConversation(`c${n}`, at(n)));
    list = upsertConversation(list, newConversation('fresh', at(999)));
    expect(list).toHaveLength(MAX_CONVERSATIONS);
    expect(list[0]?.id).toBe('fresh');
  });

  it('sets the title once when messages arrive', () => {
    const base = newConversation('c1');
    const first = withMessages(base, [user('First question')]);
    const second = withMessages(first, [user('First question'), user('Follow up')]);
    expect(first.title).toBe('First question');
    expect(second.title).toBe('First question');
  });

  it('detects unchanged message lists', () => {
    const messages = [user('a'), user('b')];
    expect(sameMessages(messages, [...messages])).toBe(true);
    expect(sameMessages(messages, [user('a')])).toBe(false);
    expect(sameMessages(messages, [user('a'), user('c')])).toBe(false);
  });

  it('removes by id', () => {
    const list = [newConversation('a'), newConversation('b')];
    expect(removeConversation(list, 'a').map((c) => c.id)).toEqual(['b']);
  });

  it('drops malformed stored entries', () => {
    const valid = newConversation('ok');
    expect(sanitizeConversations([valid, { id: 1 }, 'junk'])).toEqual([valid]);
    expect(sanitizeConversations('not an array')).toEqual([]);
  });
});
