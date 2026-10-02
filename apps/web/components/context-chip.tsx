'use client';

import { PaperclipIcon, XIcon } from '@phosphor-icons/react';
import { cn } from 'cn';
import { Address } from '@/components/address';
import { SeverityTag } from '@/components/severity-tag';
import type { ChatContext } from '@/lib/chat-context';

export interface ContextChipProps {
  context: ChatContext;
  onRemove?: () => void;
  className?: string;
}

export function ContextChip({ context, onRemove, className }: ContextChipProps) {
  return (
    <div
      className={cn(
        'flex max-w-full min-w-0 items-center gap-2 rounded-md border border-border bg-muted/50 py-1 pr-1 pl-2 text-xs',
        className,
      )}
    >
      <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <SeverityTag severity={context.severity} />
      <span className="truncate font-mono">{context.type.toLowerCase()}</span>
      <Address value={context.subject} copyable={false} />
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${context.kind} from context`}
          className="ml-auto inline-flex size-5 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <XIcon className="size-3" />
        </button>
      ) : (
        <span className="ml-auto pr-1 font-mono text-[10px] text-muted-foreground uppercase">
          {context.kind}
        </span>
      )}
    </div>
  );
}

export interface ContextChipListProps {
  contexts: ChatContext[];
  onRemove?: (index: number) => void;
  className?: string;
}

export function ContextChipList({ contexts, onRemove, className }: ContextChipListProps) {
  if (contexts.length === 0) return null;
  return (
    <div className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}>
      {contexts.map((context, index) => (
        <ContextChip
          key={`${context.kind}:${context.findingId}`}
          context={context}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}
    </div>
  );
}
