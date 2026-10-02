import { cn } from 'cn';
import type * as React from 'react';
import { StatLabel } from '@/components/stat';

export type AccentTone = 'primary' | 'warning' | 'destructive' | 'muted';

const BAR: Record<AccentTone, string> = {
  primary: 'border-primary',
  warning: 'border-warning',
  destructive: 'border-destructive',
  muted: 'border-border',
};

export interface AccentBlockProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  tone?: AccentTone;
  label?: React.ReactNode;
  aside?: React.ReactNode;
}

export function AccentBlock({
  tone = 'primary',
  label,
  aside,
  className,
  children,
  ...props
}: AccentBlockProps) {
  return (
    <div className={cn('space-y-1 border-l-2 pl-3', BAR[tone], className)} {...props}>
      {(label || aside) && (
        <div className="flex flex-wrap items-baseline gap-x-2">
          {label && <StatLabel>{label}</StatLabel>}
          {aside}
        </div>
      )}
      {children}
    </div>
  );
}
