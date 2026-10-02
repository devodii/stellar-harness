import { cn } from 'cn';
import type { ComponentProps } from 'react';

export type ToolStatus = 'running' | 'done' | 'error';

export const Tool = ({ className, ...props }: ComponentProps<'details'>) => (
  <details className={cn('group w-full', className)} {...props} />
);

export const ToolHeader = ({ title, status }: { title: string; status: ToolStatus }) => (
  <summary className="flex cursor-pointer list-none items-center gap-3 font-mono text-xs text-muted-foreground">
    <span className="truncate">{title}</span>
    <span className="ml-auto shrink-0">{status}</span>
  </summary>
);

export const ToolContent = ({ className, ...props }: ComponentProps<'div'>) => (
  <div className={cn('pt-2', className)} {...props} />
);
