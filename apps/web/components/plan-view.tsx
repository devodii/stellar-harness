'use client';

import type { Plan as PlanShape, PlanState, PlanStep, PlanStepStatus } from '@harness/schema';
import { cn } from 'cn';
import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { PolicyBoundary } from '@/components/policy-boundary';
import { Timeline, type TimelineTone } from '@/components/timeline';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { argsData, formatXlm } from '@/lib/format';
import { APPROVAL_NOTE, type PlanDecision } from '@/lib/plan-approval';
import type { Tone } from '@/lib/tone';

const STATE_TONE: Record<PlanState, Tone> = {
  proposed: 'muted',
  awaiting_approval: 'warning',
  approved: 'success',
  declined: 'destructive',
  executed: 'success',
};

const STEP_TONE: Record<PlanStepStatus, TimelineTone> = {
  done: 'done',
  pending: 'pending',
  blocked: 'blocked',
};

export const planState = (plan: PlanShape, decision?: PlanDecision): PlanState => {
  if (decision === 'approve') return 'approved';
  if (decision === 'decline') return 'declined';
  return plan.requiresApproval ? 'awaiting_approval' : 'proposed';
};

export interface PlanViewProps {
  plan: PlanShape;
  decision?: PlanDecision;
  onDecide?: (planId: string, decision: PlanDecision) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

const stepEntry = (step: PlanStep) => ({
  key: step.id,
  title: step.kind,
  meta: step.status,
  tone: STEP_TONE[step.status],
  content: (
    <div className="space-y-0.5">
      <p>{step.description}</p>
      <code className="block truncate font-mono text-xs text-muted-foreground">{step.tool}</code>
    </div>
  ),
  data: argsData(step.args),
});

export function PlanView({
  plan,
  decision,
  onDecide,
  disabled,
  defaultOpen = true,
  className,
}: PlanViewProps) {
  const state = planState(plan, decision);
  const awaiting = state === 'awaiting_approval';
  const locked = !awaiting || disabled || !onDecide;

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
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-sm font-medium text-foreground">{plan.title}</span>
              <BracketTag label={state.replace('_', ' ')} tone={STATE_TONE[state]} />
            </div>
            <div className="flex flex-wrap items-center gap-x-2 font-mono text-xs text-muted-foreground">
              <Address value={plan.subject} copyable={false} />
              <span>· {plan.steps.length} steps</span>
              {plan.estimatedCostXlm !== undefined && (
                <span>· est. {formatXlm(plan.estimatedCostXlm)}</span>
              )}
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="space-y-4 pt-2 pb-1">
          <Timeline items={plan.steps} renderItem={stepEntry} />
          {plan.requiresApproval && (
            <div className="space-y-3">
              {plan.boundary && <PolicyBoundary boundary={plan.boundary} />}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={locked}
                  onClick={() => onDecide?.(plan.planId, 'approve')}
                >
                  Approve (demo)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={locked}
                  onClick={() => onDecide?.(plan.planId, 'decline')}
                >
                  Decline
                </Button>
              </div>
              <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
                {APPROVAL_NOTE}
              </p>
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
