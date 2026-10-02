'use client';

import { useChat } from '@ai-sdk/react';
import type { HarnessMessage } from '@harness/agent';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Message, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import { ToolCall } from '@/components/tool-results';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const SUGGESTIONS = [
  'Check all our contracts and tell me which need attention',
  'Can we pay 25 USDC from treasury to distribution right now?',
  'What would it cost to keep Escrow alive for a year?',
  'Is our anchor passing conformance?',
];

export function Chat() {
  const router = useRouter();
  const { messages, sendMessage, status, error } = useChat<HarnessMessage>({
    onFinish: () => router.refresh(),
  });
  const [input, setInput] = React.useState('');
  const busy = status === 'submitted' || status === 'streaming';

  const send = (text: string) => {
    if (!text.trim() || busy) return;
    void sendMessage({ text });
    setInput('');
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {messages.length === 0 ? (
        <div className="flex flex-1 flex-wrap content-center justify-center gap-2 p-6">
          {SUGGESTIONS.map((suggestion) => (
            <Button key={suggestion} variant="outline" size="sm" onClick={() => send(suggestion)}>
              {suggestion}
            </Button>
          ))}
        </div>
      ) : (
        <Conversation>
          <ConversationContent className="mx-auto w-full max-w-3xl">
            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent
                  className={message.role === 'user' ? 'w-fit rounded-md border px-3 py-2' : ''}
                >
                  {message.parts.map((part, index) =>
                    part.type === 'text' ? (
                      message.role === 'user' ? (
                        <p key={`${message.id}-${index}`}>{part.text}</p>
                      ) : (
                        <MessageResponse key={`${message.id}-${index}`}>
                          {part.text}
                        </MessageResponse>
                      )
                    ) : (
                      <ToolCall key={`${message.id}-${index}`} part={part} />
                    ),
                  )}
                </MessageContent>
              </Message>
            ))}
            {status === 'submitted' && (
              <p className="font-mono text-xs text-muted-foreground">working…</p>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      )}
      <form
        className="mx-auto flex w-full max-w-3xl gap-2 p-4"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about the organisation's accounts, contracts or anchor"
        />
        <Button type="submit" disabled={busy || !input.trim()}>
          Send
        </Button>
      </form>
      {error && <p className="px-4 pb-4 text-center font-mono text-xs">{error.message}</p>}
    </main>
  );
}
