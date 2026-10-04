import { z } from 'zod';
import { FindingType } from './finding';
import { Snapshot } from './snapshot';

const count = z.number().int().nonnegative();
const counts = z.record(z.string(), count);

export const ScfProject = z.object({
  slug: z.string(),
  name: z.string(),
  round: z.number().int().nullable(),
  contracts: z.array(z.string()),
});
export type ScfProject = z.infer<typeof ScfProject>;

export const ContractsSummary = z.object({
  total: count,
  families: count,
  archivedInstances: count,
  archivedMeaningful: count.default(0),
  archivedByFamily: counts,
  expiring30d: count,
  expiring30dMeaningful: count.default(0),
  expiring90d: count,
  liveIdle: count,
  scfFunded: z.object({
    total: count,
    archived: count,
    expiring30d: count,
    projects: z.array(ScfProject),
  }),
});
export type ContractsSummary = z.infer<typeof ContractsSummary>;

export const FailuresSummary = z.object({
  windowStart: z.iso.datetime(),
  windowEnd: z.iso.datetime(),
  ledgersScanned: count,
  txScanned: count,
  txFailed: count,
  byCode: counts,
  preventable: z.object({ total: count, byCode: counts }),
  clusters: z.object({
    count,
    anchorDistribution: count,
    domains: z.array(z.string()),
  }),
});
export type FailuresSummary = z.infer<typeof FailuresSummary>;

export const ANCHOR_STAGES = [
  'toml',
  'accounts',
  'endpoints',
  'info',
  'sep10',
  'sep38',
  'sep31',
  'cors',
  'tests',
] as const;
export const AnchorStage = z.enum(ANCHOR_STAGES);
export type AnchorStage = z.infer<typeof AnchorStage>;

export const FailingAnchor = z.object({
  domain: z.string(),
  country: z.string().nullable(),
  region: z.string().nullable(),
  stage: AnchorStage,
  scfRound: z.number().int().optional(),
});
export type FailingAnchor = z.infer<typeof FailingAnchor>;

export const AnchorsSummary = z.object({
  domainsTested: count,
  funnel: z.object({
    tomlReachable: count,
    signingKey: count,
    endpoints: count,
    infoReadable: count,
    sep10: count,
    testsPassed: count,
  }),
  perSep: z.record(z.string(), z.object({ tested: count, passed: count })),
  failing: z.array(FailingAnchor),
});
export type AnchorsSummary = z.infer<typeof AnchorsSummary>;

export const RentSummary = z.object({
  contractsEstimated: count,
  totalXlm12m: z.number().nonnegative(),
  medianXlm12m: z.number().nonnegative(),
  scfFundedXlm12m: z.number().nonnegative(),
  xlmUsd: z.object({
    price: z.number().nonnegative(),
    source: z.string(),
    at: z.iso.datetime(),
  }),
});
export type RentSummary = z.infer<typeof RentSummary>;

export const Summary = z.object({
  snapshot: Snapshot,
  contracts: ContractsSummary,
  failures: FailuresSummary,
  anchors: AnchorsSummary,
  rent: RentSummary,
  findingsCount: z.partialRecord(FindingType, count),
});
export type Summary = z.infer<typeof Summary>;
