'use client';

import type { Plan as PlanShape, PlanState, PlanStep } from '@harness/schema';
import { cn } from 'cn';
import {
  Plan,
  PlanAction,
  PlanContent,
  PlanDescription,
  PlanFooter,
  PlanHeader,
  PlanTitle,
  PlanTrigger,
} from '@/components/ai-elements/plan';
import { BracketTag } from '@/components/bracket-tag';
import { KindTag } from '@/components/kind-tag';
import { PolicyBoundary } from '@/components/policy-boundary';
import { StatusGlyph } from '@/components/status-glyph';
import { Button } from '@/components/ui/button';
import { formatXlm, summarizeArgs } from '@/lib/format';
import { APPROVAL_NOTE, type PlanDecision } from '@/lib/plan-approval';
import type { Tone } from '@/lib/tone';

const STATE_TONE: Record<PlanState, Tone> = {
  proposed: 'muted',
  awaiting_approval: 'warning',
  approved: 'success',
  declined: 'destructive',
  executed: 'success',
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
  className?: string;
}

function PlanStepRow({ step }: { step: PlanStep }) {
  const args = summarizeArgs(step.args);
  return (
    <li className="flex gap-2.5 py-1.5">
      <StatusGlyph status={step.status} className="mt-0.5" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <KindTag kind={step.kind} />
          <span className="text-sm text-foreground">{step.description}</span>
        </div>
        <code className="block truncate font-mono text-xs text-muted-foreground">
          {step.tool}({args})
        </code>
      </div>
    </li>
  );
}

export function PlanView({ plan, decision, onDecide, disabled, className }: PlanViewProps) {
  const state = planState(plan, decision);
  const awaiting = state === 'awaiting_approval';

  return (
    <Plan defaultOpen className={cn('gap-3 py-3', className)}>
      <PlanHeader className="px-3">
        <div className="min-w-0 space-y-1">
          <PlanTitle className="text-sm">{plan.title}</PlanTitle>
          <PlanDescription className="font-mono text-xs break-all">{plan.subject}</PlanDescription>
        </div>
        <PlanAction className="flex items-center gap-2">
          <BracketTag label={state.replace('_', ' ')} tone={STATE_TONE[state]} />
          <PlanTrigger />
        </PlanAction>
      </PlanHeader>
      <PlanContent className="px-3">
        <ol className="divide-y divide-border">
          {plan.steps.map((step) => (
            <PlanStepRow key={step.id} step={step} />
          ))}
        </ol>
        {plan.estimatedCostXlm !== undefined && (
          <p className="pt-2 font-mono text-xs text-muted-foreground">
            estimated cost {formatXlm(plan.estimatedCostXlm)}
          </p>
        )}
      </PlanContent>
      {plan.requiresApproval && (
        <PlanFooter className="flex-col items-stretch gap-3 px-3">
          {plan.boundary && <PolicyBoundary boundary={plan.boundary} />}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={!awaiting || disabled || !onDecide}
              onClick={() => onDecide?.(plan.planId, 'approve')}
            >
              Approve (demo)
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!awaiting || disabled || !onDecide}
              onClick={() => onDecide?.(plan.planId, 'decline')}
            >
              Decline
            </Button>
          </div>
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {APPROVAL_NOTE}
          </p>
        </PlanFooter>
      )}
    </Plan>
  );
}
