import type { DataUIPart, TextPart, UIMessage, UITools } from 'ai';
import { ChatContext, contextToModelText } from './chat-context';

export type HarnessDataParts = { context: ChatContext };

export type HarnessUIMessage = UIMessage<unknown, HarnessDataParts, UITools>;

export type HarnessPart = HarnessUIMessage['parts'][number];

export const dataPartSchemas = { context: ChatContext };

const DATA_PREFIX = 'data-';

const isKnownPart = (part: { type: string }): boolean =>
  !part.type.startsWith(DATA_PREFIX) ||
  Object.hasOwn(dataPartSchemas, part.type.slice(DATA_PREFIX.length));

export const withKnownDataParts = <TMessage extends { parts: { type: string }[] }>(
  message: TMessage,
): TMessage => ({ ...message, parts: message.parts.filter(isKnownPart) });

export const dataPartToModelText = (part: DataUIPart<HarnessDataParts>): TextPart | undefined => {
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
