import {
  DEFAULT_NETWORK,
  type Finding,
  type FindingType,
  type Network,
  Plan,
} from '@harness/schema';
import { evaluatePolicy, type Policy } from './policy';
import { ANCHOR_RECIPES } from './recipes/anchor';
import { CONTRACT_RECIPES } from './recipes/contract';
import { REPO_RECIPES } from './recipes/repo';
import { TX_RECIPES } from './recipes/tx';
import { linkSteps, type Recipe, stepId, withNetwork } from './step';

export const RECIPES: Record<FindingType, Recipe> = {
  ...CONTRACT_RECIPES,
  ...TX_RECIPES,
  ...ANCHOR_RECIPES,
  ...REPO_RECIPES,
};

export const planIdFor = (findingId: string): string => `plan_${findingId.slice(0, 12)}`;

export const planForFinding = (
  finding: Finding,
  policy: Policy,
  network: Network = DEFAULT_NETWORK,
): Plan => {
  const draft = RECIPES[finding.type](finding);
  const steps = withNetwork(linkSteps(draft.steps), network).map((step, index) => ({
    id: stepId(index),
    ...step,
    status: 'pending' as const,
  }));
  const decision = evaluatePolicy({ steps, estimatedCostXlm: draft.estimatedCostXlm }, policy);
  return Plan.parse({
    planId: planIdFor(finding.findingId),
    title: draft.title,
    subject: finding.subject,
    steps,
    estimatedCostXlm: draft.estimatedCostXlm,
    requiresApproval: decision.requiresApproval,
    boundary: decision.boundary,
  });
};
