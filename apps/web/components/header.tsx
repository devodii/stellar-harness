import type { Org } from '@harness/schema';
import { PilotSheet } from '@/components/pilot-sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const policyLine = ({ policy }: Org): string =>
  `daily ${policy.dailySpendXlm} XLM · approval above ${policy.approvalAboveXlm} XLM · ${policy.allowedOperations.join(', ')}`;

export function Header({ org }: { org: Org }) {
  return (
    <header className="grid h-12 shrink-0 grid-cols-3 items-center border-b px-4">
      <span className="font-mono text-sm">Stellar Harness</span>
      <span className="text-center text-sm">
        {org.name} · {org.network}
      </span>
      <div className="flex items-center justify-end gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="cursor-default rounded-full border px-2.5 py-0.5 text-xs"
            >
              Policy
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono">
            {policyLine(org)}
          </TooltipContent>
        </Tooltip>
        <PilotSheet />
      </div>
    </header>
  );
}
