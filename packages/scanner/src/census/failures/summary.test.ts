import { describe, expect, it } from 'vitest';
import { FailuresSummary } from '../../schema';
import { censusSnapshot } from './__tests__/census-harness';
import { failedRow } from './__tests__/rows';
import { failuresSummary } from './summary';

const totals = [
  { ledger: 990, txCount: 200, failedCount: 2 },
  { ledger: 991, txCount: 150, failedCount: 1 },
  { ledger: 1000, txCount: 10, failedCount: 0 },
];

const failed = [
  failedRow({ ledger: 990, codes: ['tx_failed', 'op_no_trust'] }),
  failedRow({ ledger: 990, codes: ['tx_failed', 'op_over_source_max'] }),
  failedRow({ ledger: 991, codes: ['tx_bad_seq'] }),
];

const findings = [
  { tags: ['failures', 'anchor_distribution'], evidence: { homeDomain: 'Anchor.example' } },
  { tags: ['failures', 'anchor_distribution'], evidence: { homeDomain: 'anchor.example' } },
  { tags: ['failures', 'anchor_distribution', 'multisig'], evidence: { homeDomain: 'b.example' } },
  { tags: ['failures'], evidence: {} },
];

describe('failuresSummary', () => {
  it('builds a schema-valid FailuresSummary from derived rows', () => {
    const summary = failuresSummary({
      snapshot: censusSnapshot,
      ledgerTotals: totals,
      failedTx: failed,
      clusterFindings: findings,
    });
    expect(FailuresSummary.parse(summary)).toEqual(summary);
    expect(summary).toEqual({
      windowStart: '2026-10-01T23:59:10.000Z',
      windowEnd: '2026-10-02T00:00:00.000Z',
      ledgersScanned: 3,
      txScanned: 360,
      txFailed: 3,
      byCode: { tx_failed: 2, op_no_trust: 1, op_over_source_max: 1, tx_bad_seq: 1 },
      preventable: { total: 2, byCode: { op_no_trust: 1, tx_bad_seq: 1 } },
      clusters: { count: 4, anchorDistribution: 3, domains: ['anchor.example', 'b.example'] },
    });
  });

  it('prefers an explicit window', () => {
    const summary = failuresSummary({
      snapshot: censusSnapshot,
      ledgerTotals: totals,
      failedTx: [],
      clusterFindings: [],
      window: { startTime: '2026-09-25T00:00:00.000Z', endTime: '2026-10-02T00:00:00.000Z' },
    });
    expect(summary.windowStart).toBe('2026-09-25T00:00:00.000Z');
  });

  it('handles an empty scan', () => {
    const summary = failuresSummary({
      snapshot: censusSnapshot,
      ledgerTotals: [],
      failedTx: [],
      clusterFindings: [],
    });
    expect(summary).toMatchObject({ ledgersScanned: 0, txScanned: 0, byCode: {} });
  });
});
