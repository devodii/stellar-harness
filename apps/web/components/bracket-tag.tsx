import { cn } from 'cn';
import type * as React from 'react';
import { TONE_TEXT, type Tone } from '@/lib/tone';

export interface BracketTagProps extends Omit<React.ComponentProps<'span'>, 'children'> {
  label: string;
  tone?: Tone;
  emphasis?: boolean;
}

export function BracketTag({
  label,
  tone = 'muted',
  emphasis = false,
  className,
  ...props
}: BracketTagProps) {
  return (
    <span
      translate="no"
      className={cn(
        'notranslate inline-block shrink-0 font-mono text-xs whitespace-nowrap',
        TONE_TEXT[tone],
        emphasis && 'font-semibold',
        className,
      )}
      {...props}
    >
      {`[${label}]`}
    </span>
  );
}
