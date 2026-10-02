import type { Finding, Network, PlanStepKind } from '@harness/schema';
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

export const submit = (description: string): StepDraft => ({
  kind: 'submit',
  tool: 'submitTransaction',
  description,
  args: {},
});

export const withNetwork = (steps: StepDraft[], network: Network): StepDraft[] =>
  steps.map((step) =>
    step.kind === 'submit' ? { ...step, args: { ...step.args, network } } : step,
  );

const linkSource = (step: StepDraft): PlanStepKind | null => {
  if (step.kind === 'submit') return 'build';
  if (step.tool === 'buildTransaction') return 'simulate';
  return null;
};

export const linkSteps = (steps: StepDraft[]): StepDraft[] =>
  steps.map((step, index) => {
    const sourceKind = linkSource(step);
    if (!sourceKind || 'fromStep' in step.args) return step;
    const sourceIndex = steps.findLastIndex(
      (candidate, candidateIndex) => candidateIndex < index && candidate.kind === sourceKind,
    );
    if (sourceIndex < 0) return step;
    return { ...step, args: { fromStep: stepId(sourceIndex), ...step.args } };
  });
