'use client';

import { ArrowBendUpLeftIcon, PaperclipIcon, XIcon } from '@phosphor-icons/react';
import { cn } from 'cn';
import type * as React from 'react';
import { Address } from '@/components/address';
import { SeverityTag } from '@/components/severity-tag';
import {
  type ChatContext,
  contextKey,
  type FindingContext,
  type ReplyContext,
} from '@/lib/chat-context';

export interface ContextChipProps {
  context: ChatContext;
  onRemove?: () => void;
  className?: string;
}

function RemoveButton({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={label}
      className="ml-auto inline-flex size-5 shrink-0 items-center justify-center self-start rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground"
    >
      <XIcon className="size-3" />
    </button>
  );
}

function FindingChip({
  context,
  onRemove,
  className,
}: {
  context: FindingContext;
  onRemove?: () => void;
  className?: string;
}) {
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
        <RemoveButton label="Remove finding from context" onRemove={onRemove} />
      ) : (
        <span className="ml-auto pr-1 font-mono text-[10px] text-muted-foreground uppercase">
          finding
        </span>
      )}
    </div>
  );
}

function ReplyQuote({
  context,
  onRemove,
  className,
}: {
  context: ReplyContext;
  onRemove?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex max-w-full min-w-0 gap-2 rounded-md border-l-2 border-primary bg-muted py-1.5 pr-1 pl-2.5 text-xs',
        className,
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground uppercase">
          <ArrowBendUpLeftIcon className="size-3" aria-hidden />
          Replying to Harness
        </p>
        <p className="line-clamp-2 text-muted-foreground">{context.excerpt}</p>
      </div>
      {onRemove && <RemoveButton label="Remove reply from context" onRemove={onRemove} />}
    </div>
  );
}

const CHIP_BY_KIND: {
  [Kind in ChatContext['kind']]: React.ComponentType<{
    context: Extract<ChatContext, { kind: Kind }>;
    onRemove?: () => void;
    className?: string;
  }>;
} = {
  finding: FindingChip,
  reply: ReplyQuote,
};

export function ContextChip({ context, onRemove, className }: ContextChipProps) {
  const Chip = CHIP_BY_KIND[context.kind] as React.ComponentType<ContextChipProps>;
  return <Chip context={context} onRemove={onRemove} className={className} />;
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
          key={contextKey(context)}
          context={context}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}
    </div>
  );
}
