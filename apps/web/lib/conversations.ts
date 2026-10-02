import type { HarnessMessage } from '@harness/agent';
import { z } from 'zod';

export const CONVERSATIONS_KEY = 'harness:conversations:v2';
export const MAX_CONVERSATIONS = 50;
export const UNTITLED = 'New chat';
const TITLE_LENGTH = 60;

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: HarnessMessage[];
}

const StoredConversation = z.object({
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(z.object({ id: z.string(), role: z.string(), parts: z.array(z.unknown()) })),
});

export const sanitizeConversations = (value: unknown): Conversation[] =>
  Array.isArray(value)
    ? value.flatMap((item) => {
        const parsed = StoredConversation.safeParse(item);
        return parsed.success ? [parsed.data as unknown as Conversation] : [];
      })
    : [];

const firstUserText = (messages: HarnessMessage[]): string | undefined =>
  messages
    .find((message) => message.role === 'user')
    ?.parts.flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join(' ');

export const conversationTitle = (messages: HarnessMessage[]): string => {
  const text = firstUserText(messages)?.trim();
  if (!text) return UNTITLED;
  return text.length > TITLE_LENGTH ? `${text.slice(0, TITLE_LENGTH - 1)}…` : text;
};

export const newConversation = (id: string, now = new Date()): Conversation => ({
  id,
  title: UNTITLED,
  createdAt: now.toISOString(),
  updatedAt: now.toISOString(),
  messages: [],
});

export const withMessages = (
  conversation: Conversation,
  messages: HarnessMessage[],
  now = new Date(),
): Conversation => ({
  ...conversation,
  messages,
  title: conversation.title === UNTITLED ? conversationTitle(messages) : conversation.title,
  updatedAt: now.toISOString(),
});

export const sameMessages = (a: HarnessMessage[], b: HarnessMessage[]): boolean =>
  a.length === b.length && JSON.stringify(a.at(-1)) === JSON.stringify(b.at(-1));

export const upsertConversation = (list: Conversation[], conversation: Conversation) =>
  [conversation, ...list.filter((item) => item.id !== conversation.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_CONVERSATIONS);

export const removeConversation = (list: Conversation[], id: string) =>
  list.filter((item) => item.id !== id);

export const chatHref = (id: string): string => `/?c=${encodeURIComponent(id)}`;
