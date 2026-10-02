'use client';

import type { Plan as PlanShape, PlanStep, PlanStepStatus } from '@harness/schema';
import { cn } from 'cn';
import { Address } from '@/components/address';
import { HandoffBlock } from '@/components/handoff-block';
import { KindTag } from '@/components/kind-tag';
import { StatusGlyph } from '@/components/status-glyph';
import { Timeline, type TimelineEntry, type TimelineTone } from '@/components/timeline';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { argsData, formatXlm } from '@/lib/format';

const STEP_TONE: Record<PlanStepStatus, TimelineTone> = {
  done: 'done',
  pending: 'pending',
  error: 'failed',
};

export interface PlanViewProps {
  plan: PlanShape;
  defaultOpen?: boolean;
  className?: string;
}

const stepEntry =
  (plan: PlanShape) =>
  (step: PlanStep): TimelineEntry => ({
    key: step.id,
    title: <KindTag kind={step.kind} className="tracking-normal normal-case" />,
    meta: (
      <span className="inline-flex items-center gap-1">
        <StatusGlyph status={step.status} />
        {step.status}
      </span>
    ),
    tone: STEP_TONE[step.status],
    content:
      step.kind === 'handoff' ? (
        <div className="space-y-2">
          <p>{step.description}</p>
          <HandoffBlock handoff={plan.handoff} />
        </div>
      ) : (
        <div className="space-y-0.5">
          <p>{step.description}</p>
          <code className="block truncate font-mono text-xs text-muted-foreground">
            {step.tool}
          </code>
        </div>
      ),
    data: step.kind === 'handoff' ? undefined : argsData(step.args),
  });

export function PlanView({ plan, defaultOpen = true, className }: PlanViewProps) {
  const cost = plan.handoff.estimatedCostXlm;
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue={defaultOpen ? plan.planId : undefined}
      className={cn('w-full', className)}
    >
      <AccordionItem value={plan.planId} className="border-none">
        <AccordionTrigger className="items-start gap-3 py-2 hover:no-underline">
          <div className="min-w-0 flex-1 space-y-1 text-left">
            <span className="text-sm font-medium text-foreground">{plan.title}</span>
            <div className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground">
              <Address value={plan.subject} copyable={false} />
              <span>· {plan.steps.length} steps</span>
              {cost !== undefined && <span>· est. {formatXlm(cost)}</span>}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="pt-2 pb-1">
          <Timeline items={plan.steps} renderItem={stepEntry(plan)} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
