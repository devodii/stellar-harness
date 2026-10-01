import { z } from 'zod';

export const PolicyBoundary = z.object({
  rule: z.string(),
  reason: z.string(),
  threshold: z.string().optional(),
  requested: z.string().optional(),
});
export type PolicyBoundary = z.infer<typeof PolicyBoundary>;

export const PlanStepKind = z.enum(['read', 'simulate', 'build', 'submit']);
export type PlanStepKind = z.infer<typeof PlanStepKind>;

export const PlanStepStatus = z.enum(['pending', 'done', 'blocked']);
export type PlanStepStatus = z.infer<typeof PlanStepStatus>;

export const PlanStep = z.object({
  id: z.string(),
  kind: PlanStepKind,
  description: z.string(),
  tool: z.string(),
  args: z.record(z.string(), z.unknown()),
  status: PlanStepStatus,
  result: z.unknown().optional(),
});
export type PlanStep = z.infer<typeof PlanStep>;

export const Plan = z.object({
  planId: z.string(),
  title: z.string(),
  subject: z.string(),
  steps: z.array(PlanStep),
  estimatedCostXlm: z.number().nonnegative().optional(),
  requiresApproval: z.boolean(),
  boundary: PolicyBoundary.optional(),
});
export type Plan = z.infer<typeof Plan>;

export const PlanState = z.enum([
  'proposed',
  'awaiting_approval',
  'approved',
  'declined',
  'executed',
]);
export type PlanState = z.infer<typeof PlanState>;
