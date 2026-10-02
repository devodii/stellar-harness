import type { PlanStepKind } from '@harness/schema';
import { cn } from 'cn';
import { BracketTag, type BracketTagProps } from '@/components/bracket-tag';
import { Hint } from '@/components/hint';
import { KIND_HINT } from '@/lib/plan-copy';
import type { Tone } from '@/lib/tone';

const KIND_TONE: Record<PlanStepKind, Tone> = {
  read: 'muted',
  simulate: 'primary',
  handoff: 'warning',
};

export interface KindTagProps extends Omit<BracketTagProps, 'label' | 'tone'> {
  kind: PlanStepKind;
}

export function KindTag({ kind, className, ...props }: KindTagProps) {
  const hint = KIND_HINT[kind];
  const tag = (
    <BracketTag
      label={kind}
      tone={KIND_TONE[kind]}
      emphasis={kind === 'handoff'}
      tabIndex={hint ? 0 : undefined}
      className={cn(
        hint && 'cursor-help underline decoration-dotted underline-offset-4',
        className,
      )}
      {...props}
    />
  );
  return hint ? <Hint hint={hint}>{tag}</Hint> : tag;
}
