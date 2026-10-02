import {
  type Finding,
  type Handoff,
  Plan,
  type PlanStep,
  type RequiredAuthority,
  ROADMAP_NOTE,
} from '@harness/schema';
import type { ToolName } from '../tools/names';

export const HANDOFF_TOOL = 'handoff';
export const PLAN_ACTIONS = [HANDOFF_TOOL] as const;
export type StepTool = ToolName | typeof HANDOFF_TOOL;

export type StepDraft = {
  kind: 'read' | 'simulate';
  tool: ToolName;
  description: string;
  args: Record<string, unknown>;
};

export type HandoffDraft = Omit<Handoff, 'roadmapNote'>;

export type PlanDraft = {
  title: string;
  steps: StepDraft[];
  handoff: HandoffDraft;
};

export type Recipe = (finding: Finding) => PlanDraft;

export const AUTHORITY_LABELS: Record<RequiredAuthority, string> = {
  contract_admin: 'the contract admin',
  any_payer: 'any account willing to pay the fee',
  account_signer: 'the account signers',
  anchor_operator: 'the anchor operator',
};

export const stepId = (index: number): string => `s${index + 1}`;

export const read = <T extends ToolName>(
  tool: T,
  description: string,
  args: Record<string, unknown>,
): StepDraft => ({ kind: 'read', tool, description, args });

export const simulate = <T extends ToolName>(
  tool: T,
  description: string,
  args: Record<string, unknown>,
): StepDraft => ({ kind: 'simulate', tool, description, args });

export const handoff = (
  requiredAuthority: RequiredAuthority,
  summary: string,
  estimatedCostXlm?: number,
): HandoffDraft => ({
  summary,
  requiredAuthority,
  ...(estimatedCostXlm === undefined ? {} : { estimatedCostXlm }),
});

const handoffStep = (draft: HandoffDraft) => ({
  kind: 'handoff' as const,
  tool: HANDOFF_TOOL,
  description: `Hand off to ${AUTHORITY_LABELS[draft.requiredAuthority]}; the harness stops here.`,
  args: {},
});

export const assemblePlan = (planId: string, subject: string, draft: PlanDraft): Plan => {
  const steps: PlanStep[] = [...draft.steps, handoffStep(draft.handoff)].map((step, index) => ({
    id: stepId(index),
    ...step,
    status: 'pending',
  }));
  return Plan.parse({
    planId,
    title: draft.title,
    subject,
    steps,
    handoff: { ...draft.handoff, roadmapNote: ROADMAP_NOTE },
  });
};
