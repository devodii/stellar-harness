'use client';

import { generateId } from 'ai';
import { useRouter, useSearchParams } from 'next/navigation';
import * as React from 'react';
import { ChatView } from '@/components/chat-view';
import { useConversations } from '@/components/conversations-provider';
import { Skeleton } from '@/components/ui/skeleton';
import { useSummary } from '@/hooks/use-summary';
import type { HarnessUIMessage } from '@/lib/chat';
import { newConversation, sameMessages, withMessages } from '@/lib/conversations';
import { chatHref } from '@/lib/routes';
import { buildSuggestions } from '@/lib/suggestions';

function ChatSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-10">
      <Skeleton className="h-10 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <div className="grid gap-2 sm:grid-cols-2">
        {['a', 'b', 'c', 'd', 'e', 'f'].map((key) => (
          <Skeleton key={key} className="h-10" />
        ))}
      </div>
    </div>
  );
}

export function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const store = useConversations();
  const summary = useSummary();
  const [freshId] = React.useState(generateId);

  const paramId = searchParams.get('c');
  const prompt = searchParams.get('q') ?? undefined;
  const conversationId = paramId ?? freshId;

  const suggestions = React.useMemo(
    () => buildSuggestions(summary.data?.scanned ? summary.data.summary : null),
    [summary.data],
  );

  const persist = React.useCallback(
    (messages: HarnessUIMessage[]) => {
      const base = store.get(conversationId) ?? newConversation(conversationId);
      if (sameMessages(base.messages, messages)) return;
      store.save(withMessages(base, messages));
      if (paramId !== conversationId) router.replace(chatHref(conversationId), { scroll: false });
    },
    [store, conversationId, paramId, router],
  );

  if (!store.ready) return <ChatSkeleton />;
  const stored = store.get(conversationId);

  return (
    <ChatView
      key={conversationId}
      conversationId={conversationId}
      initialMessages={stored?.messages ?? []}
      initialPrompt={stored ? undefined : prompt}
      suggestions={suggestions}
      scanned={summary.data?.scanned}
      onMessagesChange={persist}
    />
  );
}
