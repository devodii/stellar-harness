import type { Operation, Org } from '@harness/schema';
import Link from 'next/link';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { PilotSheet } from '@/components/pilot-sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Wordmark } from '@/components/wordmark';

const OPERATION_LABELS: Record<Operation, string> = {
  extend_ttl: 'extend contract TTLs',
  restore: 'restore archived contracts',
  sponsor_trustline: 'sponsor trustlines',
  payment: 'make payments',
};

const listOf = (items: string[]): string =>
  items.length > 1 ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}` : (items[0] ?? '');

export const policyLine = ({ policy }: Org): string =>
  `Spends up to ${policy.dailySpendXlm} XLM a day and needs approval above ${policy.approvalAboveXlm} XLM. It may ${listOf(policy.allowedOperations.map((operation) => OPERATION_LABELS[operation]))}.`;

export function Header({ org }: { org: Org }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Wordmark className="font-mono text-sm" />
      <span className="hidden min-w-0 flex-1 truncate text-center text-sm md:block">
        {org.name} on {org.network}
      </span>
      <div className="ml-auto flex items-center gap-3 md:ml-0">
        <Hint hint={<span className="font-mono">{policyLine(org)}</span>} side="bottom">
          <button
            type="button"
            className="hidden cursor-default rounded-full border px-2.5 py-0.5 text-xs sm:inline-flex"
          >
            Policy
          </button>
        </Hint>
        <Button asChild variant="link" size="sm" className="px-0">
          <Link href="/about">about</Link>
        </Button>
        <PilotSheet />
        <ThemeToggle />
      </div>
    </header>
  );
}
