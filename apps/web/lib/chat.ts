import type { DataUIPart, TextPart, UIMessage, UITools } from 'ai';
import { ChatContext, contextToModelText } from './chat-context';
import {
  type PlanApproval,
  PlanApproval as PlanApprovalSchema,
  type PlanDecision,
} from './plan-approval';

export type HarnessDataParts = { 'plan-approval': PlanApproval; context: ChatContext };

export type HarnessUIMessage = UIMessage<unknown, HarnessDataParts, UITools>;

export type HarnessPart = HarnessUIMessage['parts'][number];

export const dataPartSchemas = { 'plan-approval': PlanApprovalSchema, context: ChatContext };

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

export const dataPartToModelText = (part: DataUIPart<HarnessDataParts>): TextPart | undefined => {
  if (part.type === 'data-plan-approval') return { type: 'text', text: JSON.stringify(part.data) };
  if (part.type === 'data-context') return { type: 'text', text: contextToModelText(part.data) };
  return undefined;
};

export const messageContexts = (message: HarnessUIMessage): ChatContext[] =>
  message.parts.flatMap((part) => (part.type === 'data-context' ? [part.data] : []));

export const messageText = (message: HarnessUIMessage): string =>
  message.parts
    .flatMap((part) => (part.type === 'text' ? [part.text] : []))
    .join('\n')
    .trim();

export const firstUserText = (message: HarnessUIMessage | undefined): string | null => {
  const part = message?.parts.find((candidate) => candidate.type === 'text');
  return part?.type === 'text' ? part.text : null;
};
