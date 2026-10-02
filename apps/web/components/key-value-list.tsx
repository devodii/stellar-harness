import { cn } from 'cn';
import type * as React from 'react';
import { StatLabel } from '@/components/stat';

export interface KeyValueItem {
  label: string;
  value: React.ReactNode;
  hidden?: boolean;
}

export interface KeyValueListProps {
  items: KeyValueItem[];
  columns?: 1 | 2;
  className?: string;
}

export function KeyValueList({ items, columns = 2, className }: KeyValueListProps) {
  return (
    <dl
      className={cn(
        'grid gap-x-6 gap-y-1.5',
        columns === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1',
        className,
      )}
    >
      {items
        .filter((item) => !item.hidden)
        .map((item) => (
          <div key={item.label} className="flex min-w-0 items-baseline justify-between gap-3">
            <dt className="shrink-0">
              <StatLabel>{item.label}</StatLabel>
            </dt>
            <dd className="min-w-0 truncate text-right font-mono text-xs text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
    </dl>
  );
}
