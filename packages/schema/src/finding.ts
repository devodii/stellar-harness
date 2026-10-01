import { z } from 'zod';

export const FINDING_TYPES = [
  'CONTRACT_INSTANCE_ARCHIVED',
  'CONTRACT_CODE_ARCHIVED',
  'CONTRACT_INSTANCE_EXPIRING_30D',
  'CONTRACT_INSTANCE_EXPIRING_90D',
  'CONTRACT_LIVE_IDLE',
  'CONTRACT_UNVERIFIED_SOURCE',
  'CONTRACT_RENT_12M',
  'TX_BAD_SEQ_CLUSTER',
  'TX_INSUFFICIENT_FEE_CLUSTER',
  'TX_TOO_LATE_CLUSTER',
  'TX_BAD_AUTH_CLUSTER',
  'OP_NO_TRUST_CLUSTER',
  'OP_UNDERFUNDED_CLUSTER',
  'OP_NO_DESTINATION_CLUSTER',
  'OP_LOW_RESERVE_CLUSTER',
  'OP_LINE_FULL_CLUSTER',
  'ANCHOR_TOML_UNREACHABLE',
  'ANCHOR_TOML_MISSING_SIGNING_KEY',
  'ANCHOR_TOML_NO_ACCOUNTS',
  'ANCHOR_HOME_DOMAIN_MISMATCH',
  'ANCHOR_ISSUER_FLAGS',
  'ANCHOR_NO_SEP_ENDPOINTS',
  'ANCHOR_INFO_UNREADABLE',
  'ANCHOR_SEP10_CHALLENGE_FAILS',
  'ANCHOR_SEP38_PRICES_FAILS',
  'ANCHOR_SEP31_INFO_FAILS',
  'ANCHOR_TESTS_FAILED',
  'ANCHOR_TLS_OR_CORS_BROKEN',
  'REPO_TTL_ISSUE',
  'REPO_TX_FAILURE_ISSUE',
  'REPO_ANCHOR_CONFORMANCE_ISSUE',
] as const;

export const FindingType = z.enum(FINDING_TYPES);
export type FindingType = z.infer<typeof FindingType>;

export const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'] as const;
export const Severity = z.enum(SEVERITIES);
export type Severity = z.infer<typeof Severity>;

export const SubjectKind = z.enum(['contract', 'account', 'anchor_domain', 'asset', 'repo']);
export type SubjectKind = z.infer<typeof SubjectKind>;

export const Finding = z.object({
  findingId: z.string().regex(/^[0-9a-f]{64}$/),
  type: FindingType,
  subjectKind: SubjectKind,
  subject: z.string().min(1),
  severity: Severity,
  evidence: z.record(z.string(), z.unknown()),
  suggestedAction: z.string(),
  snapshotLedger: z.number().int().positive(),
  observedAt: z.iso.datetime(),
  tags: z.array(z.string()),
});
export type Finding = z.infer<typeof Finding>;

export const FindingQuery = z.object({
  type: z.array(FindingType).optional(),
  subject: z.string().optional(),
  tags: z.array(z.string()).optional(),
  severity: z.array(Severity).optional(),
  limit: z.number().int().positive().max(1000).optional(),
  offset: z.number().int().nonnegative().optional(),
});
export type FindingQuery = z.infer<typeof FindingQuery>;

export const severityRank = (severity: Severity): number => SEVERITIES.indexOf(severity);
