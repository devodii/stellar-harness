import { cn } from 'cn';
import type * as React from 'react';

export interface PageHeaderProps extends Omit<React.ComponentProps<'header'>, 'title'> {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}

export function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <header
      className={cn('flex flex-wrap items-end justify-between gap-3 pt-8 pb-4', className)}
      {...props}
    >
      <div className="space-y-1">
        <h1 className="font-display text-3xl leading-tight text-foreground">{title}</h1>
        {description && <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
