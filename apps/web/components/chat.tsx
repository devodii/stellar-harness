'use client';

import { useChat } from '@ai-sdk/react';
import type { HarnessMessage } from '@harness/agent';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { ChatComposer } from '@/components/chat-composer';
import { ChatSuggestions } from '@/components/chat-suggestions';
import { InlineAlert } from '@/components/inline-alert';
import { isToolCallPart, ToolCall } from '@/components/tool-call';

type Part = HarnessMessage['parts'][number];

function MessagePart({ part, role }: { part: Part; role: HarnessMessage['role'] }) {
  if (isToolCallPart(part)) return <ToolCall part={part} />;
  if (part.type !== 'text') return null;
  return role === 'user' ? <p>{part.text}</p> : <MessageResponse>{part.text}</MessageResponse>;
}

export interface ChatProps {
  id: string;
  initialMessages?: HarnessMessage[];
  onMessagesChange?: (messages: HarnessMessage[]) => void;
}

export function Chat({ id, initialMessages = [], onMessagesChange }: ChatProps) {
  const router = useRouter();
  const { messages, sendMessage, status, stop, error } = useChat<HarnessMessage>({
    id,
    messages: initialMessages,
    onFinish: () => router.refresh(),
  });

  const onChangeRef = React.useRef(onMessagesChange);
  onChangeRef.current = onMessagesChange;
  React.useEffect(() => {
    if (messages.length > 0 && status !== 'streaming') onChangeRef.current?.(messages);
  }, [messages, status]);

  const busy = status === 'submitted' || status === 'streaming';
  const send = (text: string) => void sendMessage({ text });

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
          <ChatSuggestions onSelect={send} disabled={busy} className="w-full max-w-2xl" />
          <Link
            href="/about"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            New here? Read what the harness does.
          </Link>
        </div>
      ) : (
        <Conversation className="min-h-0">
          <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  {message.parts.map((part, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: message parts are append-only
                    <MessagePart key={index} part={part} role={message.role} />
                  ))}
                </MessageContent>
              </Message>
            ))}
            {status === 'submitted' && (
              <Shimmer as="p" className="font-mono text-xs">
                working…
              </Shimmer>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}
      <div className="mx-auto w-full max-w-3xl space-y-2 px-4 pb-4">
        {error && (
          <InlineAlert tone="destructive" title="Chat request failed">
            {error.message}
          </InlineAlert>
        )}
        <ChatComposer onSubmit={send} onStop={() => void stop()} status={status} disabled={busy} />
      </div>
    </main>
  );
}
