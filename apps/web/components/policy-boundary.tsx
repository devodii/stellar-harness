import type { PolicyBoundary as PolicyBoundaryShape } from '@harness/schema';
import { cn } from 'cn';
import { StatLabel } from '@/components/stat';

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
    <div className={cn('space-y-1 border-l-2 border-warning pl-3', className)}>
      <div className="flex flex-wrap items-baseline gap-x-2">
        <StatLabel>policy</StatLabel>
        <code className="font-mono text-xs text-foreground">{boundary.rule}</code>
      </div>
      <p className="text-sm text-foreground">{boundary.reason}</p>
      {limits.length > 0 && (
        <p className="font-mono text-xs text-muted-foreground">{limits.join(' · ')}</p>
      )}
    </div>
  );
}
