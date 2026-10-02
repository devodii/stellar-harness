import {
  type AppError,
  appError,
  err,
  ok,
  type Plan,
  type PlanState,
  type PlanStep,
  type PlanStepKind,
  type Result,
} from '@harness/schema';
import { z } from 'zod';

export const PLAN_EVENTS = [
  'propose',
  'request_approval',
  'approve',
  'decline',
  'execute',
] as const;
export const PlanEvent = z.enum(PLAN_EVENTS);
export type PlanEvent = z.infer<typeof PlanEvent>;

export const PLAN_TRANSITIONS: Record<PlanState, Partial<Record<PlanEvent, PlanState>>> = {
  proposed: { request_approval: 'awaiting_approval', decline: 'declined' },
  awaiting_approval: { approve: 'approved', decline: 'declined' },
  approved: { execute: 'executed' },
  declined: {},
  executed: {},
};

export const INITIAL_PLAN_STATE: PlanState = 'proposed';

export const transition = (state: PlanState, event: PlanEvent): Result<PlanState, AppError> => {
  if (event === 'propose') {
    return state === INITIAL_PLAN_STATE
      ? ok(INITIAL_PLAN_STATE)
      : err(
          appError('CONFLICT', `Cannot propose a plan that is already ${state}`, { state, event }),
        );
  }
  const next = PLAN_TRANSITIONS[state][event];
  if (!next) {
    return err(appError('CONFLICT', `Cannot ${event} a plan that is ${state}`, { state, event }));
  }
  return ok(next);
};

export const isTerminal = (state: PlanState): boolean =>
  Object.keys(PLAN_TRANSITIONS[state]).length === 0;

export const replay = (events: PlanEvent[]): Result<PlanState, AppError> =>
  events.reduce<Result<PlanState, AppError>>(
    (current, event) => (current.ok ? transition(current.value, event) : current),
    ok(INITIAL_PLAN_STATE),
  );

const safeJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const PlanDecision = z.enum(['approve', 'decline']);
export type PlanDecision = z.infer<typeof PlanDecision>;

export const PlanApproval = z.object({
  type: z.literal('plan-approval'),
  planId: z.string().min(1),
  decision: PlanDecision,
});
export type PlanApproval = z.infer<typeof PlanApproval>;

export const parsePlanApproval = (value: unknown): PlanApproval | null => {
  const candidate = typeof value === 'string' ? safeJson(value) : value;
  const parsed = PlanApproval.safeParse(candidate);
  return parsed.success ? parsed.data : null;
};

export const applyApproval = (
  state: PlanState,
  approval: PlanApproval,
): Result<PlanState, AppError> => transition(state, approval.decision);

export const DEMO_EXECUTABLE_KINDS: ReadonlySet<PlanStepKind> = new Set(['read', 'simulate']);

export const demoExecutableSteps = (plan: Plan): PlanStep[] =>
  plan.steps.filter((step) => DEMO_EXECUTABLE_KINDS.has(step.kind));
