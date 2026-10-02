import { Action, type Org, type Policy } from '@harness/schema';
import type { Storage } from '@harness/storage';

export const ProposeActionInput = Action.omit({ id: true, withinPolicy: true, status: true });
export type ProposeActionInput = typeof ProposeActionInput._output;

export const isWithinPolicy = (policy: Policy, input: ProposeActionInput): boolean =>
  input.operation !== 'unsupported' &&
  policy.allowedOperations.includes(input.operation) &&
  input.estimatedCostXlm !== undefined &&
  input.estimatedCostXlm <= policy.approvalAboveXlm;

export const orgSubjects = (org: Org): string[] => [
  ...org.accounts.map((account) => account.address),
  ...org.contracts.map((contract) => contract.id),
  ...(org.anchorDomain ? [org.anchorDomain] : []),
];

export const proposeAction = async (
  storage: Storage,
  input: ProposeActionInput,
): Promise<Action> => {
  const org = await storage.getOrg();
  if (!orgSubjects(org).includes(input.subject)) {
    throw new Error(`${input.subject} does not belong to ${org.name}`);
  }
  const action: Action = {
    ...input,
    id: crypto.randomUUID(),
    withinPolicy: isWithinPolicy(org.policy, input),
    status: 'proposed',
  };
  await storage.putAction(action);
  return action;
};
