import { cn } from 'cn';
import type * as React from 'react';
import { MonoNumber } from '@/components/mono-number';
import { TONE_TEXT, type Tone } from '@/lib/tone';

export interface StatProps {
  label: string;
  value: number | null | undefined;
  format?: (value: number) => string;
  hint?: React.ReactNode;
  tone?: Tone;
  size?: 'sm' | 'md';
  className?: string;
}

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

export function Stat({
  label,
  value,
  format,
  hint,
  tone = 'default',
  size = 'md',
  className,
}: StatProps) {
  return (
    <div className={cn('flex min-w-0 flex-col', className)}>
      <StatLabel className="truncate">{label}</StatLabel>
      <MonoNumber
        value={value}
        format={format}
        className={cn(size === 'sm' ? 'text-sm' : 'text-lg', TONE_TEXT[tone])}
      />
      {hint && <span className="truncate text-xs text-muted-foreground">{hint}</span>}
    </div>
  );
}
