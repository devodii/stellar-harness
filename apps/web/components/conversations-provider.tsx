'use client';

import * as React from 'react';
import { useLocalStorageState } from '@/hooks/use-local-storage-state';
import { useMounted } from '@/hooks/use-mounted';
import {
  CONVERSATIONS_KEY,
  type Conversation,
  compactImages,
  removeConversation,
  sanitizeConversations,
  upsertConversation,
} from '@/lib/conversations';

export interface ConversationsApi {
  conversations: Conversation[];
  ready: boolean;
  get: (id: string) => Conversation | undefined;
  save: (conversation: Conversation) => void;
  remove: (id: string) => void;
}

const ConversationsContext = React.createContext<ConversationsApi | null>(null);

export function ConversationsProvider({ children }: { children: React.ReactNode }) {
  const [stored, setStored] = useLocalStorageState<Conversation[]>(CONVERSATIONS_KEY, []);
  const ready = useMounted();
  const conversations = React.useMemo(() => sanitizeConversations(stored), [stored]);
  const latest = React.useRef(conversations);
  latest.current = conversations;

  const commit = React.useCallback(
    (next: Conversation[]) => {
      latest.current = next;
      setStored(compactImages(next));
    },
    [setStored],
  );

  const api = React.useMemo<ConversationsApi>(
    () => ({
      conversations: ready ? conversations : [],
      ready,
      get: (id) => latest.current.find((conversation) => conversation.id === id),
      save: (conversation) => commit(upsertConversation(latest.current, conversation)),
      remove: (id) => commit(removeConversation(latest.current, id)),
    }),
    [conversations, ready, commit],
  );

  return <ConversationsContext.Provider value={api}>{children}</ConversationsContext.Provider>;
}

export const useConversations = (): ConversationsApi => {
  const context = React.useContext(ConversationsContext);
  if (!context) throw new Error('useConversations must be used within ConversationsProvider');
  return context;
};
