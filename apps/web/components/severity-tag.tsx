import type { Severity } from '@harness/schema';
import { BracketTag, type BracketTagProps } from '@/components/bracket-tag';
import type { Tone } from '@/lib/tone';

const SEVERITY_TONE: Record<Severity, { tone: Tone; emphasis: boolean }> = {
  critical: { tone: 'destructive', emphasis: true },
  high: { tone: 'destructive', emphasis: false },
  medium: { tone: 'warning', emphasis: false },
  low: { tone: 'default', emphasis: false },
  info: { tone: 'muted', emphasis: false },
};

export interface SeverityTagProps extends Omit<BracketTagProps, 'label' | 'tone' | 'emphasis'> {
  severity: Severity;
}

export function SeverityTag({ severity, ...props }: SeverityTagProps) {
  return <BracketTag label={severity} {...SEVERITY_TONE[severity]} {...props} />;
}
