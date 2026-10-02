import type { Org } from '@harness/schema';
import { Hint } from '@/components/hint';
import { PilotSheet } from '@/components/pilot-sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Wordmark } from '@/components/wordmark';

export const policyLine = ({ policy }: Org): string =>
  `daily ${policy.dailySpendXlm} XLM · approval above ${policy.approvalAboveXlm} XLM · ${policy.allowedOperations.join(', ')}`;

export function Header({ org }: { org: Org }) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
      <SidebarTrigger />
      <Wordmark className="font-mono text-sm" />
      <span className="hidden min-w-0 flex-1 truncate text-center text-sm md:block">
        {org.name} · {org.network}
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
        <PilotSheet />
        <ThemeToggle />
      </div>
    </header>
  );
}
