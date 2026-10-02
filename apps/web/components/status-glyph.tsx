import type { PlanStepStatus } from '@harness/schema';
import { cn } from 'cn';
import { TONE_TEXT, type Tone } from '@/lib/tone';

const GLYPH: Record<PlanStepStatus, { glyph: string; tone: Tone; label: string }> = {
  pending: { glyph: '○', tone: 'muted', label: 'pending' },
  done: { glyph: '●', tone: 'success', label: 'done' },
  blocked: { glyph: '◐', tone: 'warning', label: 'blocked' },
};

export interface StatusGlyphProps {
  status: PlanStepStatus;
  className?: string;
}

export function StatusGlyph({ status, className }: StatusGlyphProps) {
  const { glyph, tone, label } = GLYPH[status];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-block w-3 shrink-0 font-mono text-xs leading-none',
        TONE_TEXT[tone],
        className,
      )}
    >
      {glyph}
    </span>
  );
}
