import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  ACTION_BY_CODE,
  emptySummary,
  FINDING_TYPES,
  Finding,
  PREVENTABLE_CODES,
  SUGGESTED_ACTION,
  Summary,
  toolResult,
} from './index';

const snapshot = {
  snapshotLedger: 64722632,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc123',
  network: 'mainnet' as const,
};

describe('schema', () => {
  it('accepts an empty summary', () => {
    expect(Summary.parse(emptySummary(snapshot)).snapshot.snapshotLedger).toBe(64722632);
  });

  it('has a suggested action for every finding type', () => {
    for (const type of FINDING_TYPES) expect(SUGGESTED_ACTION[type]).toMatch(/\.$/);
  });

  it('has an action for every preventable code', () => {
    for (const code of PREVENTABLE_CODES) expect(ACTION_BY_CODE[code]).toBeTruthy();
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

  it('builds a discriminated tool result', () => {
    const schema = toolResult(z.object({ n: z.number() }));
    const parsed = schema.parse({ ok: true, data: { n: 1 }, meta: { tool: 't', ms: 1 } });
    expect(parsed.ok).toBe(true);
  });
});
