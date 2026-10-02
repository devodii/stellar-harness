'use client';

import { CaretDownIcon, CaretUpIcon } from '@phosphor-icons/react';
import { cn } from 'cn';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export type TimelineTone = 'done' | 'pending' | 'blocked' | 'failed' | 'muted';

export type TimelineValue = string | number | boolean;

export interface TimelineEntry {
  key: React.Key;
  title: React.ReactNode;
  meta?: React.ReactNode;
  content?: React.ReactNode;
  data?: Record<string, TimelineValue | null | undefined>;
  tone?: TimelineTone;
}

export interface TimelineProps<T> {
  items: readonly T[];
  renderItem: (item: T, index: number) => TimelineEntry;
  isLoading?: boolean;
  limit?: number;
  emptyMessage?: string;
  skeletonRowCount?: number;
  className?: string;
}

const SKELETON_KEYS = ['one', 'two', 'three', 'four', 'five', 'six'];

const DOT_CLASS: Record<TimelineTone, string> = {
  done: 'bg-primary dark:bg-[color:oklch(from_var(--primary)_calc(l_+_0.25)_c_h)]',
  pending: 'border border-muted-foreground/50 bg-background',
  blocked: 'bg-warning',
  failed:
    'bg-destructive dark:bg-[color:oklch(from_var(--destructive)_calc(l_+_0.32)_calc(c_*_1.6)_h)]',
  muted: 'bg-muted-foreground/40',
};

const formatLabel = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, (letter) => letter.toUpperCase());

function TimelineData({ data }: { data: NonNullable<TimelineEntry['data']> }) {
  const entries = Object.entries(data).filter(
    (entry): entry is [string, TimelineValue] => entry[1] !== null && entry[1] !== undefined,
  );
  if (entries.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs">
      {entries.map(([key, value], index) => (
        <React.Fragment key={key}>
          {index > 0 && <span className="text-muted-foreground/40">•</span>}
          <span>
            <span className="text-muted-foreground">{formatLabel(key)}:</span>{' '}
            <span className="text-foreground/80">{String(value)}</span>
          </span>
        </React.Fragment>
      ))}
    </div>
  );
}

function TimelineRail() {
  return (
    <div
      aria-hidden
      className="absolute top-2 left-[5px] w-px bg-border"
      style={{ height: 'calc(100% - 1.25rem)' }}
    />
  );
}

export function Timeline<T>({
  items,
  renderItem,
  isLoading,
  limit = 0,
  emptyMessage = 'Nothing yet',
  skeletonRowCount = 3,
  className,
}: TimelineProps<T>) {
  const [expanded, setExpanded] = React.useState(false);

  if (isLoading) {
    return (
      <ol className={cn('relative m-0 list-none p-0', className)}>
        <TimelineRail />
        {SKELETON_KEYS.slice(0, skeletonRowCount).map((key) => (
          <li key={key} className="relative pb-5 pl-6 last:pb-0">
            <span className="absolute top-1.5 left-0 size-[11px] rounded-full bg-muted ring-4 ring-background" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-3 w-full max-w-sm" />
          </li>
        ))}
      </ol>
    );
  }

  if (items.length === 0) {
    return <p className={cn('py-6 text-sm text-muted-foreground', className)}>{emptyMessage}</p>;
  }

  const collapsible = limit > 0 && items.length > limit;
  const visible = collapsible && !expanded ? items.slice(0, limit) : items;

  return (
    <div className={cn('relative', className)}>
      <ol className="relative m-0 list-none p-0">
        <TimelineRail />
        {visible.map((item, index) => {
          const entry = renderItem(item, index);
          return (
            <li key={entry.key} className="group relative pb-5 pl-6 last:pb-0">
              <span
                className={cn(
                  'absolute top-1.5 left-0 z-10 size-[11px] rounded-full ring-4 ring-background transition-transform group-hover:scale-110',
                  DOT_CLASS[entry.tone ?? 'done'],
                )}
              />
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-3">
                  <h4 className="font-mono text-[10px] tracking-widest text-muted-foreground uppercase">
                    {entry.title}
                  </h4>
                  {entry.meta && (
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground/70">
                      {entry.meta}
                    </span>
                  )}
                </div>
                {entry.content && <div className="text-sm text-foreground">{entry.content}</div>}
                {entry.data && <TimelineData data={entry.data} />}
              </div>
            </li>
          );
        })}
      </ol>
      {collapsible && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-2 h-7 gap-1.5 px-2 font-mono text-xs text-muted-foreground"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <CaretUpIcon className="size-3" /> : <CaretDownIcon className="size-3" />}
          {expanded ? 'Show less' : `Show ${items.length - limit} more`}
        </Button>
      )}
    </div>
  );
}
