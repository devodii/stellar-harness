import { describe, expect, it } from 'vitest';
import {
  ACTION_BY_CODE,
  emptySummary,
  FINDING_TYPES,
  Finding,
  isPreventableCode,
  PREVENTABLE_CODES,
  SUGGESTED_ACTION,
  Summary,
} from './index';

const snapshot = {
  snapshotLedger: 64722632,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc123',
  network: 'mainnet' as const,
};

describe('scan schema', () => {
  it('accepts an empty summary', () => {
    expect(Summary.parse(emptySummary(snapshot)).snapshot.snapshotLedger).toBe(64722632);
  });

  it('has a suggested action for every finding type', () => {
    for (const type of FINDING_TYPES) expect(SUGGESTED_ACTION[type]).toMatch(/\.$/);
  });

  it('has an action for every preventable code', () => {
    for (const code of PREVENTABLE_CODES) expect(ACTION_BY_CODE[code]).toBeTruthy();
  });

  it('recognises preventable codes', () => {
    expect(isPreventableCode('tx_bad_seq')).toBe(true);
    expect(isPreventableCode('tx_internal_error')).toBe(false);
  });

  it('rejects a finding with a malformed id', () => {
    const result = Finding.safeParse({
      findingId: 'nope',
      type: 'TX_BAD_SEQ_CLUSTER',
      subjectKind: 'account',
      subject: 'G',
      severity: 'high',
      evidence: {},
      suggestedAction: ACTION_BY_CODE.tx_bad_seq,
      snapshotLedger: 1,
      observedAt: snapshot.snapshotTime,
      tags: [],
    });
    expect(result.success).toBe(false);
  });
});
