import type { Finding } from '@harness/schema';

type Evidence = Finding['evidence'];

export const evidenceString = (evidence: Evidence, ...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = evidence[key];
    if (typeof value === 'string' && value.length > 0) return value;
    if (Array.isArray(value) && typeof value[0] === 'string' && value[0].length > 0) {
      return value[0];
    }
  }
  return undefined;
};

export const evidenceNumber = (evidence: Evidence, ...keys: string[]): number | undefined => {
  for (const key of keys) {
    const value = evidence[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      return Number(value);
    }
  }
  return undefined;
};

export const sampleTxHash = (finding: Finding): string | undefined =>
  evidenceString(finding.evidence, 'sampleHash', 'sampleTxHash', 'sampleHashes', 'hashes');

export const CONTRACT_ID_PATTERN = /^C[A-Z2-7]{55}$/;

export const contractRef = (finding: Finding): string =>
  CONTRACT_ID_PATTERN.test(finding.subject)
    ? finding.subject
    : (evidenceString(finding.evidence, 'contractId', 'contract', 'contracts', 'sampleContract') ??
      finding.subject);
