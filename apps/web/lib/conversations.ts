import { z } from 'zod';
import { firstUserText, type HarnessUIMessage } from './chat';

export const CONVERSATIONS_KEY = 'harness:conversations:v1';
export const MAX_CONVERSATIONS = 50;
const TITLE_LENGTH = 60;
export const UNTITLED = 'New chat';

export interface Conversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: HarnessUIMessage[];
}

const StoredConversation = z.object({
  id: z.string().min(1),
  title: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(z.object({ id: z.string(), role: z.string(), parts: z.array(z.unknown()) })),
});

export const sanitizeConversations = (value: unknown): Conversation[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = StoredConversation.safeParse(item);
    return parsed.success ? [parsed.data as unknown as Conversation] : [];
  });
};

export const conversationTitle = (messages: HarnessUIMessage[]): string => {
  const text = firstUserText(messages.find((message) => message.role === 'user'))?.trim();
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

export const upsertConversation = (
  list: Conversation[],
  conversation: Conversation,
): Conversation[] =>
  [conversation, ...list.filter((item) => item.id !== conversation.id)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_CONVERSATIONS);

export const removeConversation = (list: Conversation[], id: string): Conversation[] =>
  list.filter((item) => item.id !== id);

export const sameMessages = (a: HarnessUIMessage[], b: HarnessUIMessage[]): boolean =>
  a.length === b.length && JSON.stringify(a.at(-1)) === JSON.stringify(b.at(-1));

export const withMessages = (
  conversation: Conversation,
  messages: HarnessUIMessage[],
  now = new Date(),
): Conversation => ({
  ...conversation,
  messages,
  title: conversation.title === UNTITLED ? conversationTitle(messages) : conversation.title,
  updatedAt: now.toISOString(),
});

export const STORAGE_BUDGET_BYTES = 3_500_000;

const withoutImages = (message: HarnessUIMessage): HarnessUIMessage => ({
  ...message,
  parts: message.parts.filter((part) => part.type !== 'file'),
});

export const compactImages = (
  list: Conversation[],
  budget = STORAGE_BUDGET_BYTES,
): Conversation[] => {
  const size = (value: Conversation[]) => JSON.stringify(value).length;
  if (size(list) <= budget) return list;
  const compacted = list.map((conversation) => ({
    ...conversation,
    messages: [...conversation.messages],
  }));
  const oldestFirst = [...compacted].sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
  for (const conversation of oldestFirst) {
    for (const [index, message] of conversation.messages.entries()) {
      if (!message.parts.some((part) => part.type === 'file')) continue;
      conversation.messages[index] = withoutImages(message);
      if (size(compacted) <= budget) return compacted;
    }
  }
  return compacted;
};
