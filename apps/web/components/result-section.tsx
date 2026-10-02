import { cn } from 'cn';
import type * as React from 'react';

export interface ResultSectionProps {
  title: React.ReactNode;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function ResultSection({ title, aside, footer, children, className }: ResultSectionProps) {
  return (
    <section className={cn('space-y-3 py-1 text-sm', className)}>
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="min-w-0 truncate font-mono text-xs text-muted-foreground">{title}</h3>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </header>
      <div className="space-y-3">{children}</div>
      {footer && <footer className="text-xs text-muted-foreground">{footer}</footer>}
    </section>
  );
}
