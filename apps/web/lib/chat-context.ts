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

export const ChatContext = z.discriminatedUnion('kind', [FindingContext]);
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

export const contextKey = (context: ChatContext): string => `${context.kind}:${context.findingId}`;

export const DEFAULT_CONTEXT_PROMPT: Record<ChatContext['kind'], string> = {
  finding: 'Plan a fix for this finding.',
};

export const contextToModelText = (context: ChatContext): string =>
  [
    `Attached ${context.kind} (use findingId ${context.findingId} with planFix or queryFindings):`,
    JSON.stringify(context),
  ].join('\n');

export const addContext = (contexts: ChatContext[], next: ChatContext): ChatContext[] =>
  contexts.some((context) => contextKey(context) === contextKey(next))
    ? contexts
    : [...contexts, next];
