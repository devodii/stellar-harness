import type { PlanStepKind } from '@harness/schema';
import { BracketTag, type BracketTagProps } from '@/components/bracket-tag';
import type { Tone } from '@/lib/tone';

const KIND_TONE: Record<PlanStepKind, Tone> = {
  read: 'muted',
  simulate: 'primary',
  build: 'warning',
  submit: 'destructive',
};

export interface KindTagProps extends Omit<BracketTagProps, 'label' | 'tone'> {
  kind: PlanStepKind;
}

export function KindTag({ kind, ...props }: KindTagProps) {
  return <BracketTag label={kind} tone={KIND_TONE[kind]} emphasis={kind === 'submit'} {...props} />;
}
