'use client';

import type { ChatStatus } from 'ai';
import { cn } from 'cn';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputHeader,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { ContextChipList } from '@/components/context-chip';
import { NetworkSwitch } from '@/components/network-switch';
import type { ChatContext } from '@/lib/chat-context';

export interface ChatComposerProps {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  status?: ChatStatus;
  disabled?: boolean;
  placeholder?: string;
  contexts?: ChatContext[];
  onRemoveContext?: (index: number) => void;
  className?: string;
}

export function ChatComposer({
  onSubmit,
  onStop,
  status = 'ready',
  disabled,
  placeholder = 'Ask about an account, transaction, contract or anchor…',
  contexts = [],
  onRemoveContext,
  className,
}: ChatComposerProps) {
  const attached = contexts.length > 0;
  return (
    <PromptInput
      className={cn('bg-card', className)}
      onSubmit={(message) => {
        const text = message.text.trim();
        if ((text || attached) && !disabled) onSubmit(text);
      }}
    >
      {attached && (
        <PromptInputHeader className="px-3 pt-3">
          <ContextChipList contexts={contexts} onRemove={onRemoveContext} />
        </PromptInputHeader>
      )}
      <PromptInputBody>
        <PromptInputTextarea
          placeholder={attached ? 'Ask about the attached finding…' : placeholder}
          disabled={disabled}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <NetworkSwitch />
          <span className="font-mono text-[11px] text-muted-foreground">
            · read-only · nothing is signed
          </span>
        </PromptInputTools>
        <PromptInputSubmit status={status} onStop={onStop} disabled={disabled} />
      </PromptInputFooter>
    </PromptInput>
  );
}
