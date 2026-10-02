import { cn } from 'cn';
import type * as React from 'react';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Wordmark } from '@/components/wordmark';

export interface TopBarProps {
  strip?: React.ReactNode;
  className?: string;
}

export function TopBar({ strip, className }: TopBarProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex h-12 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur',
        className,
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <Wordmark />
      <div className="mx-1 hidden h-4 w-px bg-border sm:block" aria-hidden />
      <div className="min-w-0 flex-1">{strip}</div>
      <ThemeToggle className="size-8" />
    </header>
  );
}
