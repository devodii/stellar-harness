import { Finding, SUGGESTED_ACTION } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { findingIdOf, toFinding } from './finding';

describe('toFinding', () => {
  it('fills id, suggested action and snapshot fields', () => {
    const finding = toFinding(
      {
        type: 'ANCHOR_SEP10_CHALLENGE_FAILS',
        subjectKind: 'anchor_domain',
        subject: 'clpx.finance',
        severity: 'high',
        evidence: { domain: 'clpx.finance' },
        tags: ['anchor'],
      },
      { snapshotLedger: 59_000_000, observedAt: '2026-10-02T00:00:00.000Z' },
    );
    expect(Finding.parse(finding)).toEqual(finding);
    expect(finding.suggestedAction).toBe(SUGGESTED_ACTION.ANCHOR_SEP10_CHALLENGE_FAILS);
    expect(finding.findingId).toBe(
      findingIdOf('ANCHOR_SEP10_CHALLENGE_FAILS', 'clpx.finance', 59_000_000),
    );
  });

  it('hashes type, subject and ledger', () => {
    const a = findingIdOf('ANCHOR_TOML_UNREACHABLE', 'a.example', 1);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(findingIdOf('ANCHOR_TOML_UNREACHABLE', 'a.example', 2)).not.toBe(a);
  });
});
