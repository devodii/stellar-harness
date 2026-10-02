import type { PolicyBoundary as PolicyBoundaryShape } from '@harness/schema';
import { cn } from 'cn';
import { StatLabel } from '@/components/stat';

export interface PolicyBoundaryProps {
  boundary: PolicyBoundaryShape;
  className?: string;
}

export function PolicyBoundary({ boundary, className }: PolicyBoundaryProps) {
  return (
    <div
      className={cn('space-y-2 rounded-md border border-warning/40 bg-warning/5 p-3', className)}
    >
      <div className="flex flex-wrap items-baseline gap-x-2">
        <StatLabel>policy boundary</StatLabel>
        <code className="font-mono text-xs text-warning">{boundary.rule}</code>
      </div>
      <p className="text-xs text-foreground">{boundary.reason}</p>
      {(boundary.requested || boundary.threshold) && (
        <dl className="grid grid-cols-2 gap-3 font-mono text-xs">
          <div>
            <dt>
              <StatLabel>requested</StatLabel>
            </dt>
            <dd className="text-foreground">{boundary.requested ?? 'n/a'}</dd>
          </div>
          <div>
            <dt>
              <StatLabel>threshold</StatLabel>
            </dt>
            <dd className="text-foreground">{boundary.threshold ?? 'n/a'}</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
