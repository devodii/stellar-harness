import type { Finding, FindingType, Plan } from '@harness/schema';
import { ANCHOR_RECIPES } from './recipes/anchor';
import { CONTRACT_RECIPES } from './recipes/contract';
import { REPO_RECIPES } from './recipes/repo';
import { TX_RECIPES } from './recipes/tx';
import { assemblePlan, type Recipe } from './step';

export const RECIPES: Record<FindingType, Recipe> = {
  ...CONTRACT_RECIPES,
  ...TX_RECIPES,
  ...ANCHOR_RECIPES,
  ...REPO_RECIPES,
};

export const planIdFor = (findingId: string): string => `plan_${findingId.slice(0, 12)}`;

export const planForFinding = (finding: Finding): Plan =>
  assemblePlan(planIdFor(finding.findingId), finding.subject, RECIPES[finding.type](finding));
