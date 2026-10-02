'use client';

import type { ChatStatus } from 'ai';
import { cn } from 'cn';
import {
  PromptInput,
  PromptInputBody,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from '@/components/ai-elements/prompt-input';
import { NetworkSwitch } from '@/components/network-switch';

export interface ChatComposerProps {
  onSubmit: (text: string) => void;
  onStop?: () => void;
  status?: ChatStatus;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function ChatComposer({
  onSubmit,
  onStop,
  status = 'ready',
  disabled,
  placeholder = 'Ask about an account, transaction, contract or anchor…',
  className,
}: ChatComposerProps) {
  return (
    <PromptInput
      className={cn('bg-card', className)}
      onSubmit={(message) => {
        const text = message.text.trim();
        if (text && !disabled) onSubmit(text);
      }}
    >
      <PromptInputBody>
        <PromptInputTextarea placeholder={placeholder} disabled={disabled} />
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
