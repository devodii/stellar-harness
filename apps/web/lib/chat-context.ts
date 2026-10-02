import { type Finding, FindingType, Severity } from '@harness/schema';
import { z } from 'zod';

export const EVIDENCE_BUDGET = 2_000;

export const FindingContext = z.object({
  kind: z.literal('finding'),
  findingId: z.string(),
  type: FindingType,
  subject: z.string(),
  severity: Severity,
  suggestedAction: z.string(),
  snapshotLedger: z.number().int(),
  evidence: z.record(z.string(), z.unknown()),
});
export type FindingContext = z.infer<typeof FindingContext>;

export const REPLY_EXCERPT_LENGTH = 180;

export const ReplyContext = z.object({
  kind: z.literal('reply'),
  messageId: z.string(),
  excerpt: z.string().max(REPLY_EXCERPT_LENGTH + 1),
});
export type ReplyContext = z.infer<typeof ReplyContext>;

export const ChatContext = z.discriminatedUnion('kind', [FindingContext, ReplyContext]);
export type ChatContext = z.infer<typeof ChatContext>;

const trimEvidence = (evidence: Record<string, unknown>): Record<string, unknown> => {
  const trimmed: Record<string, unknown> = {};
  let size = 0;
  for (const [key, value] of Object.entries(evidence)) {
    const length = JSON.stringify(value ?? null).length + key.length;
    if (size + length > EVIDENCE_BUDGET) {
      trimmed.truncated = true;
      break;
    }
    trimmed[key] = value;
    size += length;
  }
  return trimmed;
};

export const contextFromFinding = (finding: Finding): FindingContext => ({
  kind: 'finding',
  findingId: finding.findingId,
  type: finding.type,
  subject: finding.subject,
  severity: finding.severity,
  suggestedAction: finding.suggestedAction,
  snapshotLedger: finding.snapshotLedger,
  evidence: trimEvidence(finding.evidence),
});

export const contextKey = (context: ChatContext): string =>
  context.kind === 'finding' ? `finding:${context.findingId}` : `reply:${context.messageId}`;

const plainText = (markdown: string): string =>
  markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[`*_#>|[\]]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

export const excerptOf = (text: string, length = REPLY_EXCERPT_LENGTH): string => {
  const plain = plainText(text);
  return plain.length > length ? `${plain.slice(0, length).trimEnd()}…` : plain;
};

export const replyContext = (messageId: string, text: string): ReplyContext => ({
  kind: 'reply',
  messageId,
  excerpt: excerptOf(text),
});

export const DEFAULT_CONTEXT_PROMPT: Record<ChatContext['kind'], string> = {
  finding: 'Plan a fix for this finding.',
  reply: 'Tell me more about this.',
};

export const contextToModelText = (context: ChatContext): string =>
  context.kind === 'finding'
    ? [
        `Attached finding (use findingId ${context.findingId} with planFix or queryFindings):`,
        JSON.stringify(context),
      ].join('\n')
    : `Replying to this part of your earlier answer:\n> ${context.excerpt}`;

export const addContext = (contexts: ChatContext[], next: ChatContext): ChatContext[] =>
  contexts.some((context) => contextKey(context) === contextKey(next))
    ? contexts
    : [...contexts, next];
