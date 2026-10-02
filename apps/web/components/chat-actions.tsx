'use client';

import * as React from 'react';
import type { RenderContext } from '@/lib/tool-renderers';

export interface ChatActions extends RenderContext {
  sendPrompt: (text: string) => void;
}

const NOOP_ACTIONS: ChatActions = { decisions: {}, sendPrompt: () => {} };

const ChatActionsContext = React.createContext<ChatActions>(NOOP_ACTIONS);

export function ChatActionsProvider({
  value,
  children,
}: {
  value: ChatActions;
  children: React.ReactNode;
}) {
  return <ChatActionsContext.Provider value={value}>{children}</ChatActionsContext.Provider>;
}

export const useChatActions = (): ChatActions => React.useContext(ChatActionsContext);
