import { createHash } from 'node:crypto';
import { JsonFileStorage, type Storage } from '@harness/storage';
import { Finding, type FindingType, type Severity, type Snapshot, SUGGESTED_ACTION, type SubjectKind } from '../schema';

export const findingId = (type: FindingType, subject: string, snapshotLedger: number): string =>
  createHash('sha256').update(`${type}:${subject}:${snapshotLedger}`).digest('hex');

export type FindingInput = {
  type: FindingType;
  subjectKind: SubjectKind;
  subject: string;
  severity: Severity;
  evidence: Record<string, unknown>;
  tags?: string[];
  suggestedAction?: string;
};

export const makeFinding = (
  input: FindingInput,
  snapshot: Pick<Snapshot, 'snapshotLedger'>,
  observedAt: Date = new Date(),
): Finding =>
  Finding.parse({
    findingId: findingId(input.type, input.subject, snapshot.snapshotLedger),
    type: input.type,
    subjectKind: input.subjectKind,
    subject: input.subject,
    severity: input.severity,
    evidence: input.evidence,
    suggestedAction: input.suggestedAction ?? SUGGESTED_ACTION[input.type],
    snapshotLedger: snapshot.snapshotLedger,
    observedAt: observedAt.toISOString(),
    tags: [...new Set(input.tags ?? [])],
  });

export type FindingSink = {
  readonly storage: Storage;
  emit(finding: Finding): Promise<boolean>;
  emitMany(findings: Finding[]): Promise<number>;
  readonly emitted: number;
  readonly duplicates: number;
};

export const createFindingSink = (target: Storage | string): FindingSink => {
  const storage = typeof target === 'string' ? new JsonFileStorage(target) : target;
  const seen = new Set<string>();
  let emitted = 0;
  let duplicates = 0;
  let queue: Promise<unknown> = Promise.resolve();

  const write = async (finding: Finding): Promise<boolean> => {
    const valid = Finding.parse(finding);
    if (seen.has(valid.findingId) || (await storage.getFinding(valid.findingId))) {
      seen.add(valid.findingId);
      duplicates += 1;
      return false;
    }
    seen.add(valid.findingId);
    await storage.putFindings([valid]);
    emitted += 1;
    return true;
  };

  const emit = (finding: Finding): Promise<boolean> => {
    const result = queue.then(() => write(finding));
    queue = result.catch(() => undefined);
    return result;
  };

  return {
    storage,
    emit,
    async emitMany(findings) {
      let fresh = 0;
      for (const finding of findings) if (await emit(finding)) fresh += 1;
      return fresh;
    },
    get emitted() {
      return emitted;
    },
    get duplicates() {
      return duplicates;
    },
  };
};
