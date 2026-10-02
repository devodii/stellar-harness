import { cn } from 'cn';
import type * as React from 'react';

export function StatLabel({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      className={cn(
        'text-xs tracking-wide text-muted-foreground [font-variant-caps:all-small-caps]',
        className,
      )}
      {...props}
    />
  );
}
