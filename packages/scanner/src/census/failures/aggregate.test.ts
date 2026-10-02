import { describe, expect, it } from 'vitest';
import { failedRow } from './__tests__/rows';
import { FailureAggregator, failureCodes, isPreventableFailure } from './aggregate';

describe('failureCodes', () => {
  it('includes the tx code and distinct non-success op codes for tx_failed', () => {
    expect(
      failureCodes({
        tx: 'tx_failed',
        ops: ['op_success', 'op_underfunded', 'op_underfunded', 'op_no_trust'],
      }),
    ).toEqual(['tx_failed', 'op_underfunded', 'op_no_trust']);
  });

  it('ignores op codes for other tx codes', () => {
    expect(failureCodes({ tx: 'tx_bad_seq', ops: [] })).toEqual(['tx_bad_seq']);
    expect(failureCodes({ tx: 'tx_too_late', ops: ['op_underfunded'] })).toEqual(['tx_too_late']);
  });
});

describe('isPreventableFailure', () => {
  it('flags failures with any preventable code', () => {
    expect(isPreventableFailure({ tx: 'tx_failed', ops: ['op_low_reserve'] })).toBe(true);
    expect(isPreventableFailure({ tx: 'tx_bad_seq', ops: [] })).toBe(true);
    expect(isPreventableFailure({ tx: 'tx_failed', ops: ['op_too_few_offers'] })).toBe(false);
  });
});

describe('FailureAggregator', () => {
  it('counts codes, preventable and other failures, and ledger totals', () => {
    const aggregator = new FailureAggregator();
    aggregator.addLedgerTotals([
      { ledger: 100, txCount: 10, failedCount: 3 },
      { ledger: 101, txCount: 5, failedCount: 1 },
      { ledger: 102, txCount: 0, failedCount: 0 },
    ]);
    aggregator.addFailed([
      failedRow({ ledger: 100, codes: ['tx_failed', 'op_underfunded', 'op_underfunded'] }),
      failedRow({ ledger: 100, codes: ['tx_failed', 'op_over_source_max'] }),
      failedRow({ ledger: 100, codes: ['tx_bad_seq'] }),
      failedRow({ ledger: 101, codes: ['tx_failed', 'op_no_trust', 'function_trapped'] }),
    ]);

    expect(aggregator.result()).toEqual({
      ledgersScanned: 3,
      txScanned: 15,
      txFailed: 4,
      failedRows: 4,
      byCode: {
        tx_failed: 3,
        op_underfunded: 1,
        op_over_source_max: 1,
        tx_bad_seq: 1,
        op_no_trust: 1,
        function_trapped: 1,
      },
      preventable: { total: 3, byCode: { op_underfunded: 1, tx_bad_seq: 1, op_no_trust: 1 } },
      other: { total: 1 },
    });
    expect(aggregator.series()).toEqual([
      { ledger: 100, txCount: 10, failedCount: 3, preventableCount: 2 },
      { ledger: 101, txCount: 5, failedCount: 1, preventableCount: 1 },
      { ledger: 102, txCount: 0, failedCount: 0, preventableCount: 0 },
    ]);
  });
});
