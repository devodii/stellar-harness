import { createHash } from 'node:crypto';
import {
  type Finding,
  type FindingType,
  SUGGESTED_ACTION,
  type SubjectKind,
} from '@harness/schema';

export const SNAPSHOT_LEDGER = 59_000_000;
export const CONTRACT_ID = 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA';
export const ACCOUNT_ID = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
export const ANCHOR_DOMAIN = 'anchor.example.com';
export const REPO_URL = 'https://github.com/example/soroban-app/issues/12';

const subjectFor = (type: FindingType): { subjectKind: SubjectKind; subject: string } => {
  if (type.startsWith('CONTRACT_')) return { subjectKind: 'contract', subject: CONTRACT_ID };
  if (type.startsWith('ANCHOR_')) return { subjectKind: 'anchor_domain', subject: ANCHOR_DOMAIN };
  if (type.startsWith('REPO_')) return { subjectKind: 'repo', subject: REPO_URL };
  return { subjectKind: 'account', subject: ACCOUNT_ID };
};

export const findingIdFor = (type: FindingType, subject: string): string =>
  createHash('sha256').update(`${type}${subject}${SNAPSHOT_LEDGER}`).digest('hex');

export const makeFinding = (type: FindingType, overrides: Partial<Finding> = {}): Finding => {
  const { subjectKind, subject } = subjectFor(type);
  const resolvedSubject = overrides.subject ?? subject;
  return {
    findingId: findingIdFor(type, resolvedSubject),
    type,
    subjectKind,
    subject: resolvedSubject,
    severity: 'high',
    evidence: {},
    suggestedAction: SUGGESTED_ACTION[type],
    snapshotLedger: SNAPSHOT_LEDGER,
    observedAt: '2026-10-02T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
};
