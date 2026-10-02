import type { Finding, PlanStepKind } from '@harness/schema';
import type { ToolName } from '../tools/names';

export const PLAN_ACTIONS = ['buildTransaction', 'submitTransaction', 'draftNotice'] as const;
export type PlanAction = (typeof PLAN_ACTIONS)[number];
export type StepTool = ToolName | PlanAction;

export type StepDraft = {
  kind: PlanStepKind;
  tool: StepTool;
  description: string;
  args: Record<string, unknown>;
};

export type PlanDraft = {
  title: string;
  steps: StepDraft[];
  estimatedCostXlm?: number;
};

export type Recipe = (finding: Finding) => PlanDraft;

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

export const build = (description: string, args: Record<string, unknown>): StepDraft => ({
  kind: 'build',
  tool: 'buildTransaction',
  description,
  args,
});

export const notice = (description: string, args: Record<string, unknown>): StepDraft => ({
  kind: 'build',
  tool: 'draftNotice',
  description,
  args,
});

export const submit = (description: string, fromStep: string): StepDraft => ({
  kind: 'submit',
  tool: 'submitTransaction',
  description,
  args: { fromStep, network: 'mainnet' },
});
