import { createHash } from 'node:crypto';
import { type Finding, type FindingType, SUGGESTED_ACTION } from '../../schema';
import type { FindingDraft } from './schemas';

export const findingIdOf = (type: FindingType, subject: string, snapshotLedger: number): string =>
  createHash('sha256').update(`${type}${subject}${snapshotLedger}`).digest('hex');

export const toFinding = (
  draft: FindingDraft,
  { snapshotLedger, observedAt }: { snapshotLedger: number; observedAt: string },
): Finding => ({
  findingId: findingIdOf(draft.type, draft.subject, snapshotLedger),
  ...draft,
  suggestedAction: SUGGESTED_ACTION[draft.type],
  snapshotLedger,
  observedAt,
});
