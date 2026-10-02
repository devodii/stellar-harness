import type { Org } from '@harness/schema';
import { Hint } from '@/components/hint';
import { PilotSheet } from '@/components/pilot-sheet';
import { ThemeToggle } from '@/components/theme-toggle';
import { Wordmark } from '@/components/wordmark';

export const policyLine = ({ policy }: Org): string =>
  `daily ${policy.dailySpendXlm} XLM · approval above ${policy.approvalAboveXlm} XLM · ${policy.allowedOperations.join(', ')}`;

export function Header({ org }: { org: Org }) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-3 items-center border-b px-4">
      <Wordmark className="font-mono text-sm" />
      <span className="text-center text-sm">
        {org.name} · {org.network}
      </span>
      <div className="flex items-center justify-end gap-4">
        <Hint hint={<span className="font-mono">{policyLine(org)}</span>} side="bottom">
          <button
            type="button"
            className="cursor-default rounded-full border px-2.5 py-0.5 text-xs"
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
