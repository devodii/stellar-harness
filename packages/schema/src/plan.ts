import { z } from 'zod';

export const PlanStepKind = z.enum(['read', 'simulate', 'handoff']);
export type PlanStepKind = z.infer<typeof PlanStepKind>;

export const PlanStepStatus = z.enum(['pending', 'done', 'error']);
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

export const REQUIRED_AUTHORITIES = [
  'contract_admin',
  'any_payer',
  'account_signer',
  'anchor_operator',
] as const;
export const RequiredAuthority = z.enum(REQUIRED_AUTHORITIES);
export type RequiredAuthority = z.infer<typeof RequiredAuthority>;

export const ROADMAP_NOTE =
  "This demo observes and simulates. Executing under an organisation's smart-account policy is the funded roadmap and is not available here.";

export const Handoff = z.object({
  summary: z.string().min(1),
  requiredAuthority: RequiredAuthority,
  estimatedCostXlm: z.number().nonnegative().optional(),
  roadmapNote: z.literal(ROADMAP_NOTE),
});
export type Handoff = z.infer<typeof Handoff>;

export const Plan = z
  .object({
    planId: z.string(),
    title: z.string(),
    subject: z.string(),
    steps: z.array(PlanStep).min(1),
    handoff: Handoff,
  })
  .refine(
    (plan) =>
      plan.steps.at(-1)?.kind === 'handoff' &&
      plan.steps.filter((step) => step.kind === 'handoff').length === 1,
    { message: 'A plan ends in exactly one handoff step' },
  );
export type Plan = z.infer<typeof Plan>;
