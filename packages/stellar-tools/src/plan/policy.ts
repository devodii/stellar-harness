import { defineEnv, type EnvSource, type Plan, type PolicyBoundary } from '@harness/schema';
import { z } from 'zod';

export const DEFAULT_SPEND_CAP_XLM = 5;

export const PolicyEnv = {
  POLICY_SPEND_CAP_XLM: z.coerce.number().positive().default(DEFAULT_SPEND_CAP_XLM),
};

export const Policy = z.object({ spendCapXlm: z.number().positive() });
export type Policy = z.infer<typeof Policy>;

export const readPolicy = (source?: EnvSource): Policy => ({
  spendCapXlm: defineEnv(PolicyEnv, source).POLICY_SPEND_CAP_XLM,
});

export type PolicyDecision = { requiresApproval: boolean; boundary?: PolicyBoundary };

export const formatXlm = (xlm: number): string => `${Number(xlm.toFixed(7))} XLM`;

export const evaluatePolicy = (
  plan: Pick<Plan, 'steps' | 'estimatedCostXlm'>,
  policy: Policy = readPolicy(),
): PolicyDecision => {
  const cost = plan.estimatedCostXlm;
  if (cost !== undefined && cost > policy.spendCapXlm) {
    return {
      requiresApproval: true,
      boundary: {
        rule: 'spend_cap',
        reason: `Estimated cost exceeds the policy spend cap of ${formatXlm(policy.spendCapXlm)}.`,
        threshold: formatXlm(policy.spendCapXlm),
        requested: formatXlm(cost),
      },
    };
  }
  const submitSteps = plan.steps.filter((step) => step.kind === 'submit').length;
  if (submitSteps > 0) {
    return {
      requiresApproval: true,
      boundary: {
        rule: 'submit_requires_approval',
        reason: 'The plan submits a transaction; every submission needs explicit approval.',
        threshold: '0 submissions without approval',
        requested: `${submitSteps} submission${submitSteps === 1 ? '' : 's'}`,
      },
    };
  }
  return { requiresApproval: false };
};
