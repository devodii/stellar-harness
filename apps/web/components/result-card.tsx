import { cn } from 'cn';
import type * as React from 'react';

export interface ResultCardProps {
  title: React.ReactNode;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ResultCard({ title, aside, footer, children, className }: ResultCardProps) {
  return (
    <section
      className={cn('overflow-hidden rounded-md border border-border bg-card text-sm', className)}
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2">
        <h3 className="min-w-0 truncate font-mono text-xs text-foreground">{title}</h3>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>
      <div className="space-y-3 p-3">{children}</div>
      {footer && (
        <footer className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          {footer}
        </footer>
      )}
    </section>
  );
}
