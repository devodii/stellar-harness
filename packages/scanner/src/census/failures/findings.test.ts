import { describe, expect, it } from 'vitest';
import type { AccountClassification } from './classify';
import type { ClusterCandidate } from './clusters';
import { toFindingDraft } from './findings';

const cluster: ClusterCandidate = {
  type: 'TX_TOO_LATE_CLUSTER',
  account: 'GACCOUNT',
  severity: 'medium',
  evidence: {
    count: 12,
    firstLedger: 10,
    lastLedger: 90,
    sameLedgerCollisions: 0,
    codes: { tx_too_late: 12 },
    sampleHashes: ['a', 'b', 'c'],
    accountFailures: 14,
  },
};

describe('toFindingDraft', () => {
  it('carries cluster evidence, multisig evidence and classification tags', () => {
    const classification: AccountClassification = {
      account: 'GACCOUNT',
      exists: true,
      tags: ['multisig', 'anchor_distribution'],
      multisig: true,
      medThreshold: 2,
      signerCount: 3,
      homeDomain: 'Example.com',
      contractCallerShare: 0,
    };
    expect(toFindingDraft(cluster, classification)).toEqual({
      type: 'TX_TOO_LATE_CLUSTER',
      subjectKind: 'account',
      subject: 'GACCOUNT',
      severity: 'medium',
      evidence: {
        ...cluster.evidence,
        accountExists: true,
        multisig: true,
        medThreshold: 2,
        signerCount: 3,
        homeDomain: 'Example.com',
        contractCallerShare: 0,
      },
      tags: ['failures', 'multisig', 'anchor_distribution', 'domain:example.com'],
    });
  });

  it('adds the reserve shortfall only to low reserve clusters', () => {
    const classification: AccountClassification = {
      account: 'GACCOUNT',
      exists: true,
      tags: [],
      multisig: false,
      reserveShortfallXlm: 0.0475819,
    };
    const lowReserve = { ...cluster, type: 'OP_LOW_RESERVE_CLUSTER' as const };
    expect(toFindingDraft(lowReserve, classification).evidence.reserveShortfallXlm).toBe(0.0475819);
    expect(toFindingDraft(cluster, classification).evidence).not.toHaveProperty(
      'reserveShortfallXlm',
    );
  });

  it('works without a classification', () => {
    expect(toFindingDraft(cluster, undefined)).toMatchObject({
      evidence: cluster.evidence,
      tags: ['failures'],
    });
  });
});
