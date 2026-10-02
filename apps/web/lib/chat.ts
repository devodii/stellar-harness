import type { UIMessage, UITools } from 'ai';
import {
  type PlanApproval,
  PlanApproval as PlanApprovalSchema,
  type PlanDecision,
} from './plan-approval';

export type HarnessDataParts = { 'plan-approval': PlanApproval };

export type HarnessUIMessage = UIMessage<unknown, HarnessDataParts, UITools>;

export type HarnessPart = HarnessUIMessage['parts'][number];

export const dataPartSchemas = { 'plan-approval': PlanApprovalSchema };

export const planDecisions = (messages: HarnessUIMessage[]): Record<string, PlanDecision> => {
  const decisions: Record<string, PlanDecision> = {};
  for (const message of messages) {
    if (message.role !== 'user') continue;
    for (const part of message.parts) {
      if (part.type === 'data-plan-approval') decisions[part.data.planId] = part.data.decision;
    }
  }
  return decisions;
};

export const firstUserText = (message: HarnessUIMessage | undefined): string | null => {
  const part = message?.parts.find((candidate) => candidate.type === 'text');
  return part?.type === 'text' ? part.text : null;
};
