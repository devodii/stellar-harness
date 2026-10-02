import type { Action } from '@harness/schema';
import { cn } from 'cn';
import { BracketTag } from '@/components/bracket-tag';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { formatDecimal } from '@/lib/format';

export const COMING_SOON =
  "coming soon · execution runs under the organisation's smart-account policy via Stellar Wallets Kit agent mode";

const AGENT_MODE_ISSUE = 'https://github.com/Creit-Tech/Stellar-Wallets-Kit/issues/111';

function ComingSoon() {
  return (
    <span className="font-mono">
      coming soon · execution runs under the organisation&apos;s smart-account policy via{' '}
      <a
        href={AGENT_MODE_ISSUE}
        target="_blank"
        rel="noreferrer"
        className="underline underline-offset-2"
      >
        Stellar Wallets Kit agent mode
      </a>
    </span>
  );
}

const policyLabel = (action: Action): string =>
  action.withinPolicy ? 'within policy' : 'needs approval';

const costLabel = (action: Action): string =>
  action.estimatedCostXlm === undefined
    ? 'cost unknown'
    : `${formatDecimal(action.estimatedCostXlm, 2)} XLM`;

function ActionButtons() {
  return (
    <Hint hint={<ComingSoon />}>
      <span className="inline-flex gap-2">
        <Button size="xs" disabled>
          Execute
        </Button>
        <Button size="xs" variant="outline" disabled>
          Approve
        </Button>
      </span>
    </Hint>
  );
}

export interface ActionCardProps {
  action: Action;
  compact?: boolean;
  className?: string;
}

export function ActionCard({ action, compact = false, className }: ActionCardProps) {
  return (
    <article
      className={cn(
        'space-y-2',
        compact ? 'border-b py-3 last:border-b-0' : 'rounded-md border p-3',
        className,
      )}
    >
      <p className={cn('font-medium', compact && 'text-sm')}>{action.title}</p>
      {!compact && <p className="text-sm text-muted-foreground">{action.why}</p>}
      <p className="flex flex-wrap items-center gap-x-3 font-mono text-xs">
        <span>{costLabel(action)}</span>
        <BracketTag
          label={policyLabel(action)}
          tone={action.withinPolicy ? 'muted' : 'default'}
          emphasis={!action.withinPolicy}
        />
        {!compact && <span className="text-muted-foreground">{action.operation}</span>}
      </p>
      <ActionButtons />
    </article>
  );
}
