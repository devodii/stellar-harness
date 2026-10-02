import { AnchorStage, FindingType, Severity, SubjectKind } from '@harness/schema';
import { z } from 'zod';

const nullableString = z.string().nullable();
const nullableNumber = z.number().nullable();

export const StageRecord = z.object({
  stage: AnchorStage,
  ok: z.boolean(),
  status: z.number().int().nullable(),
  ms: z.number().nonnegative(),
  error: nullableString,
});
export type StageRecord = z.infer<typeof StageRecord>;

export const AnchorCurrency = z.object({ code: z.string(), issuer: nullableString });
export type AnchorCurrency = z.infer<typeof AnchorCurrency>;

export const AnchorToml = z.object({
  signingKey: nullableString,
  accounts: z.array(z.string()),
  currencies: z.array(AnchorCurrency),
  transferServer: nullableString,
  transferServerSep24: nullableString,
  directPaymentServer: nullableString,
  anchorQuoteServer: nullableString,
  webAuthEndpoint: nullableString,
  kycServer: nullableString,
  networkPassphrase: nullableString,
  version: nullableString,
});
export type AnchorToml = z.infer<typeof AnchorToml>;

export const FindingDraft = z.object({
  type: FindingType,
  subjectKind: SubjectKind,
  subject: z.string().min(1),
  severity: Severity,
  evidence: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()),
});
export type FindingDraft = z.infer<typeof FindingDraft>;

export const ANCHOR_TEST_SEPS = [1, 10, 12, 24, 31, 38] as const;
export const AnchorTestSep = z.literal(ANCHOR_TEST_SEPS);
export type AnchorTestSep = z.infer<typeof AnchorTestSep>;

export const AnchorSepResult = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  blocked: z.number().int().nonnegative().default(0),
  names: z.array(z.string()),
});
export type AnchorSepResult = z.infer<typeof AnchorSepResult>;

export const ExcludedTest = z.object({
  sep: z.number().int(),
  group: z.string(),
  assertion: z.string(),
  reason: z.string(),
});
export type ExcludedTest = z.infer<typeof ExcludedTest>;

export const AnchorTestsReport = z.object({
  domain: z.string(),
  requestedSeps: z.array(AnchorTestSep),
  ranSeps: z.array(AnchorTestSep),
  perSep: z.record(z.string(), AnchorSepResult),
  excludedSeps: z.array(z.object({ sep: AnchorTestSep, reason: z.string() })),
  excludedTests: z.array(ExcludedTest),
  error: nullableString,
});
export type AnchorTestsReport = z.infer<typeof AnchorTestsReport>;

export const AccountCheck = z.object({
  id: z.string(),
  roles: z.array(z.enum(['account', 'issuer'])),
  codes: z.array(z.string()),
  found: z.boolean(),
  homeDomain: nullableString,
  flags: z
    .object({
      auth_required: z.boolean(),
      auth_revocable: z.boolean(),
      auth_immutable: z.boolean(),
      auth_clawback_enabled: z.boolean(),
    })
    .nullable(),
  thresholds: z
    .object({
      low_threshold: z.number(),
      med_threshold: z.number(),
      high_threshold: z.number(),
    })
    .nullable(),
  signers: nullableNumber,
  balances: nullableNumber,
  error: nullableString,
});
export type AccountCheck = z.infer<typeof AccountCheck>;

export const EndpointProbe = z.object({
  url: z.string(),
  ok: z.boolean(),
  status: z.number().int().nullable(),
  ms: z.number().nonnegative(),
  error: nullableString,
});
export type EndpointProbe = z.infer<typeof EndpointProbe>;

export const InfoAsset = z.object({
  code: z.string(),
  enabled: z.boolean(),
  feeFixed: nullableNumber,
  minAmount: nullableNumber,
});
export type InfoAsset = z.infer<typeof InfoAsset>;

export const TransferSep = z.enum(['sep6', 'sep24']);
export type TransferSep = z.infer<typeof TransferSep>;

export const InfoServer = EndpointProbe.extend({
  sep: TransferSep,
  deposit: z.array(InfoAsset),
  withdraw: z.array(InfoAsset),
});
export type InfoServer = z.infer<typeof InfoServer>;

export const ChallengeChecks = z.object({
  mainnetPassphrase: z.boolean(),
  sourceIsSigningKey: z.boolean(),
  firstOpManageData: z.boolean(),
  homeDomainMatches: z.boolean(),
  timeboundsPresent: z.boolean(),
});
export type ChallengeChecks = z.infer<typeof ChallengeChecks>;

export const Sep10Probe = EndpointProbe.extend({
  clientDomainRequired: z.boolean(),
  networkPassphrase: nullableString,
  checks: ChallengeChecks.nullable(),
});
export type Sep10Probe = z.infer<typeof Sep10Probe>;

export const CorsTarget = z.enum(['toml', 'sep6_info', 'sep24_info', 'sep31_info', 'sep38_info']);
export type CorsTarget = z.infer<typeof CorsTarget>;

export const CorsCheck = z.object({
  target: CorsTarget,
  url: z.string(),
  cors: z.boolean(),
  tls: z.boolean().nullable(),
  tlsError: nullableString,
});
export type CorsCheck = z.infer<typeof CorsCheck>;

export const ProbeDetails = z.object({
  accounts: z.array(AccountCheck),
  endpoints: z.array(z.string()),
  info: z.array(InfoServer),
  sep10: Sep10Probe.nullable(),
  sep38: EndpointProbe.nullable(),
  sep31: EndpointProbe.nullable(),
  cors: z.array(CorsCheck),
});
export type ProbeDetails = z.infer<typeof ProbeDetails>;

export const AnchorProbeResult = z.object({
  domain: z.string(),
  tomlUrl: z.string(),
  stages: z.array(StageRecord),
  toml: AnchorToml.nullable(),
  tags: z.array(z.string()),
  findings: z.array(FindingDraft),
  details: ProbeDetails,
  anchorTests: AnchorTestsReport.nullable(),
});
export type AnchorProbeResult = z.infer<typeof AnchorProbeResult>;
