import { emptySummary } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { hasScanData, summaryMetrics, topCodes } from './summary';

const snapshot = {
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network: 'mainnet' as const,
};

describe('summary metrics', () => {
  it('treats the empty summary as no scan data', () => {
    const summary = emptySummary(snapshot);
    expect(hasScanData(summary)).toBe(false);
    expect(summaryMetrics(summary).preventableShare).toBeNull();
  });

  it('derives shares and window length', () => {
    const base = emptySummary(snapshot);
    const summary = {
      ...base,
      failures: {
        ...base.failures,
        windowStart: '2026-09-25T00:00:00.000Z',
        txScanned: 1000,
        txFailed: 200,
        preventable: { total: 50, byCode: { tx_bad_seq: 50 } },
      },
    };
    const metrics = summaryMetrics(summary);
    expect(hasScanData(summary)).toBe(true);
    expect(metrics.preventableShare).toBe(0.25);
    expect(metrics.windowDays).toBe(7);
  });

  it('ranks codes by count', () => {
    expect(topCodes({ a: 1, b: 3, c: 2 }, 2)).toEqual([
      ['b', 3],
      ['c', 2],
    ]);
  });
});
