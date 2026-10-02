'use client';

import type { Handoff } from '@harness/schema';
import { cn } from 'cn';
import { BracketTag } from '@/components/bracket-tag';
import { ConnectButton } from '@/components/connect-sheet';
import { Hint } from '@/components/hint';
import { KeyValueList } from '@/components/key-value-list';
import { formatXlm } from '@/lib/format';
import { HANDOFF_HINT } from '@/lib/plan-copy';

export interface HandoffBlockProps {
  handoff: Handoff;
  className?: string;
}

export function HandoffBlock({ handoff, className }: HandoffBlockProps) {
  return (
    <Hint hint={HANDOFF_HINT} side="top">
      <section
        aria-label="handoff"
        className={cn('space-y-2 rounded-md border border-border p-3 text-sm', className)}
      >
        <p className="text-foreground">{handoff.summary}</p>
        <KeyValueList
          columns={1}
          items={[
            {
              label: 'required authority',
              value: (
                <BracketTag label={handoff.requiredAuthority} tone="warning" className="text-xs" />
              ),
            },
            {
              label: 'estimated cost',
              value: (
                <span className="font-mono text-xs">
                  {formatXlm(handoff.estimatedCostXlm ?? 0)}
                </span>
              ),
              hidden: handoff.estimatedCostXlm === undefined,
            },
          ]}
        />
        <p className="text-[11px] leading-relaxed text-muted-foreground">{handoff.roadmapNote}</p>
        <ConnectButton variant="inline" />
      </section>
    </Hint>
  );
}
