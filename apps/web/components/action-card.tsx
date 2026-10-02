import type { Action } from '@harness/schema';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatXlm } from '@/lib/format';

const COMING_SOON =
  "coming soon · execution runs under the organisation's smart-account policy via Stellar Wallets Kit agent mode";

const policyTag = (action: Action): string =>
  action.withinPolicy ? 'within policy' : 'needs approval';

function ActionButtons() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex gap-2">
          <Button size="xs" disabled>
            Execute
          </Button>
          <Button size="xs" variant="outline" disabled>
            Approve
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 font-mono">{COMING_SOON}</TooltipContent>
    </Tooltip>
  );
}

export function ActionCard({ action, compact = false }: { action: Action; compact?: boolean }) {
  return (
    <div
      className={cn('space-y-2 rounded-md border p-3', compact && 'border-0 border-b px-0 py-3')}
    >
      <p className={cn('font-medium', compact && 'text-sm')}>{action.title}</p>
      {!compact && <p className="text-sm text-muted-foreground">{action.why}</p>}
      <p className="flex flex-wrap gap-x-3 font-mono text-xs">
        <span>
          {action.estimatedCostXlm === undefined
            ? 'cost unknown'
            : formatXlm(action.estimatedCostXlm)}
        </span>
        <span className={cn(!action.withinPolicy && 'font-semibold')}>{policyTag(action)}</span>
        {!compact && <span className="text-muted-foreground">{action.operation}</span>}
      </p>
      <ActionButtons />
    </div>
  );
}
