import type { AccountClassification } from './classify';
import type { ClusterCandidate } from './clusters';
import type { FindingDraft } from './ports';

export const FAILURES_TAG = 'failures';

const RESERVE_CLUSTER = 'OP_LOW_RESERVE_CLUSTER';

const classificationEvidence = (
  classification: AccountClassification | undefined,
  type: ClusterCandidate['type'],
) => {
  if (!classification) return {};
  return {
    reserveShortfallXlm: type === RESERVE_CLUSTER ? classification.reserveShortfallXlm : undefined,
    accountExists: classification.exists,
    multisig: classification.multisig,
    medThreshold: classification.medThreshold,
    signerCount: classification.signerCount,
    homeDomain: classification.homeDomain,
    funder: classification.funder,
    firstOperationType: classification.firstOperationType,
    contractCallerShare: classification.contractCallerShare,
  };
};

const withoutUndefined = (record: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));

export const clusterTags = (classification: AccountClassification | undefined): string[] => {
  const tags = [FAILURES_TAG, ...(classification?.tags ?? [])];
  if (classification?.homeDomain) tags.push(`domain:${classification.homeDomain.toLowerCase()}`);
  return tags;
};

export const toFindingDraft = (
  cluster: ClusterCandidate,
  classification: AccountClassification | undefined,
): FindingDraft => ({
  type: cluster.type,
  subjectKind: 'account',
  subject: cluster.account,
  severity: cluster.severity,
  evidence: withoutUndefined({
    ...cluster.evidence,
    ...classificationEvidence(classification, cluster.type),
  }),
  tags: clusterTags(classification),
});
