import { fakeFetcher } from '@harness/stellar-tools/contracts/testing';
import { describe, expect, it } from 'vitest';
import unverified from './__fixtures__/expert-contract-detail-unverified.json';
import verified from './__fixtures__/expert-contract-detail-verified.json';
import {
  codeFindings,
  fetchValidationStatuses,
  instanceFindings,
  isLiveIdle,
  unverifiedCandidates,
  unverifiedFindings,
} from './fingerprints';
import { contractRow, sequentialRun, ttl } from './testing';

const SNAPSHOT = 64_722_837;
const scf = { slug: 'reflector', name: 'Reflector', round: 29 };

const types = (findings: { type: string }[]) => findings.map((finding) => finding.type);

describe('instanceFindings', () => {
  it('emits archived as critical with scf tags', () => {
    const [finding] = instanceFindings(
      [contractRow(1, { instance: ttl.archived(), invocations: 5, scf })],
      { snapshotLedger: SNAPSHOT },
    );
    expect(finding).toMatchObject({
      type: 'CONTRACT_INSTANCE_ARCHIVED',
      severity: 'critical',
      subjectKind: 'contract',
      tags: ['contract', 'scf_funded', 'scf:reflector', 'scf_round_29'],
      evidence: { liveUntilLedgerSeq: 0, snapshotLedger: SNAPSHOT, scfSlug: 'reflector' },
    });
  });

  it('emits exactly one expiry bucket per contract', () => {
    const findings = instanceFindings(
      [contractRow(1, { instance: ttl.live(10) }), contractRow(2, { instance: ttl.live(60) })],
      { snapshotLedger: SNAPSHOT },
    );
    expect(findings.map((f) => [f.type, f.severity])).toEqual([
      ['CONTRACT_INSTANCE_EXPIRING_30D', 'high'],
      ['CONTRACT_INSTANCE_EXPIRING_90D', 'medium'],
    ]);
  });

  it('skips contracts whose ttl lookup failed', () => {
    expect(instanceFindings([contractRow(1, { instance: null })], { snapshotLedger: 1 })).toEqual(
      [],
    );
  });

  it('flags live contracts with no activity as idle info', () => {
    const findings = instanceFindings([contractRow(1, { invocations: 0, subinvocations: 0 })], {
      snapshotLedger: SNAPSHOT,
    });
    expect(findings).toMatchObject([
      { type: 'CONTRACT_LIVE_IDLE', severity: 'info', evidence: { basis: 'no_invocations' } },
    ]);
  });
});

describe('isLiveIdle', () => {
  it('counts sub-invocations as activity', () => {
    expect(isLiveIdle(contractRow(1, { invocations: 0, subinvocations: 3 }))).toBe(false);
  });

  it('uses unchanged activity against a previous run when available', () => {
    const row = contractRow(1, { invocations: 40, subinvocations: 2 });
    expect(isLiveIdle(row, new Map([[row.contract, 42]]))).toBe(true);
    expect(isLiveIdle(row, new Map([[row.contract, 41]]))).toBe(false);
  });

  it('never flags archived instances', () => {
    expect(isLiveIdle(contractRow(1, { instance: ttl.archived(), invocations: 0 }))).toBe(false);
  });
});

describe('codeFindings', () => {
  it('emits one critical finding per archived wasm with affected instances', () => {
    const wasm = 'cd'.repeat(32);
    const rows = [
      contractRow(1, { wasm, code: ttl.archived(), familySize: 2 }),
      contractRow(2, { wasm, code: ttl.archived(), familySize: 2, instance: ttl.archived(), scf }),
      contractRow(3),
    ];
    const findings = codeFindings(rows, SNAPSHOT);
    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({
      type: 'CONTRACT_CODE_ARCHIVED',
      severity: 'critical',
      subject: wasm,
      evidence: {
        familySize: 2,
        liveInstances: 1,
        contracts: [rows[0]?.contract, rows[1]?.contract],
      },
    });
    expect(findings[0]?.tags).toContain('scf:reflector');
  });
});

describe('unverified source', () => {
  const busy = contractRow(1, { contract: unverified.contract, invocations: 235_213 });
  const audited = contractRow(2, { contract: verified.contract, invocations: 33_589 });
  const quiet = contractRow(3, { invocations: 100 });
  const BASE = 'https://api.stellar.expert/explorer/public';

  it('only checks contracts with more than 100 invocations', () => {
    expect(unverifiedCandidates([busy, audited, quiet])).toEqual([busy, audited]);
  });

  it('reads validation status from stellar.expert details and flags unverified as low', async () => {
    const fetch = fakeFetcher({
      [`${BASE}/contract/${unverified.contract}`]: { body: unverified },
      [`${BASE}/contract/${verified.contract}`]: { body: verified },
    });
    const { statuses, failures } = await fetchValidationStatuses(
      { fetch, stellarExpertUrl: BASE, run: sequentialRun },
      [busy, audited, quiet],
    );
    expect(failures).toBe(0);
    expect(statuses).toEqual(
      new Map([
        [unverified.contract, 'unverified'],
        [verified.contract, 'verified'],
      ]),
    );
    const findings = unverifiedFindings([busy, audited, quiet], statuses, SNAPSHOT);
    expect(types(findings)).toEqual(['CONTRACT_UNVERIFIED_SOURCE']);
    expect(findings[0]).toMatchObject({
      subject: unverified.contract,
      severity: 'low',
      evidence: { validationStatus: 'unverified', invocations: 235_213 },
    });
  });
});
