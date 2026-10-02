'use client';

import { useChat } from '@ai-sdk/react';
import type { Finding } from '@harness/schema';
import * as React from 'react';
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from '@/components/ai-elements/conversation';
import { Shimmer } from '@/components/ai-elements/shimmer';
import { type ChatActions, ChatActionsProvider } from '@/components/chat-actions';
import { ChatComposer } from '@/components/chat-composer';
import { ChatEmpty } from '@/components/chat-empty';
import { ChatMessage } from '@/components/chat-message';
import { InlineAlert } from '@/components/inline-alert';
import { dataPartSchemas, type HarnessUIMessage, planDecisions } from '@/lib/chat';
import { chatErrorMessage } from '@/lib/chat-errors';
import { approvalText, type PlanDecision, planApproval } from '@/lib/plan-approval';
import { type ChatSuggestion, planFixPrompt } from '@/lib/suggestions';

export interface ChatViewProps {
  conversationId: string;
  initialMessages: HarnessUIMessage[];
  suggestions: ChatSuggestion[];
  scanned?: boolean;
  initialPrompt?: string;
  onMessagesChange?: (messages: HarnessUIMessage[]) => void;
}

export function ChatView({
  conversationId,
  initialMessages,
  suggestions,
  scanned,
  initialPrompt,
  onMessagesChange,
}: ChatViewProps) {
  const { messages, sendMessage, status, stop, error, clearError } = useChat<HarnessUIMessage>({
    id: conversationId,
    messages: initialMessages,
    dataPartSchemas,
  });
  const busy = status === 'submitted' || status === 'streaming';

  const onChangeRef = React.useRef(onMessagesChange);
  onChangeRef.current = onMessagesChange;
  React.useEffect(() => {
    if (messages.length > 0 && status !== 'streaming') onChangeRef.current?.(messages);
  }, [messages, status]);

  const sendPrompt = React.useCallback(
    (text: string) => {
      clearError();
      void sendMessage({ text });
    },
    [sendMessage, clearError],
  );

  const sentInitial = React.useRef(false);
  React.useEffect(() => {
    if (!initialPrompt || sentInitial.current || initialMessages.length > 0) return;
    sentInitial.current = true;
    sendPrompt(initialPrompt);
  }, [initialPrompt, initialMessages.length, sendPrompt]);

  const actions = React.useMemo<ChatActions>(
    () => ({
      decisions: planDecisions(messages),
      busy,
      sendPrompt,
      onDecide: (planId: string, decision: PlanDecision) => {
        const data = planApproval(planId, decision);
        clearError();
        void sendMessage({
          role: 'user',
          parts: [
            { type: 'text', text: approvalText(data) },
            { type: 'data-plan-approval', data },
          ],
        });
      },
      onFinding: (finding: Finding) =>
        sendPrompt(planFixPrompt(finding.findingId, finding.type, finding.subject)),
    }),
    [messages, busy, sendPrompt, sendMessage, clearError],
  );

  const last = messages.at(-1);

  return (
    <ChatActionsProvider value={actions}>
      <div className="flex min-h-0 flex-1 flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 overflow-y-auto">
            <ChatEmpty
              suggestions={suggestions}
              onSelect={sendPrompt}
              scanned={scanned}
              disabled={busy}
            />
          </div>
        ) : (
          <Conversation className="min-h-0">
            <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message}
                  streaming={status === 'streaming' && message.id === last?.id}
                />
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
              {chatErrorMessage(error)}
            </InlineAlert>
          )}
          <ChatComposer onSubmit={sendPrompt} onStop={() => void stop()} status={status} />
        </div>
      </div>
    </ChatActionsProvider>
  );
}
