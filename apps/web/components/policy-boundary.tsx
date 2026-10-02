import type { PolicyBoundary as PolicyBoundaryShape } from '@harness/schema';
import { AccentBlock } from '@/components/accent-block';

export interface PolicyBoundaryProps {
  boundary: PolicyBoundaryShape;
  className?: string;
}

export function PolicyBoundary({ boundary, className }: PolicyBoundaryProps) {
  const limits = [
    boundary.requested && `${boundary.requested} requested`,
    boundary.threshold && `${boundary.threshold} threshold`,
  ].filter(Boolean);

  return (
    <AccentBlock
      tone="warning"
      label="policy"
      aside={<code className="font-mono text-xs text-foreground">{boundary.rule}</code>}
      className={className}
    >
      <p className="text-sm text-foreground">{boundary.reason}</p>
      {limits.length > 0 && (
        <p className="font-mono text-xs text-muted-foreground">{limits.join(' · ')}</p>
      )}
    </AccentBlock>
  );
}
