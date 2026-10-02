import { emptySummary } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { LiveResponse } from './api-schemas';
import { buildLive } from './live';

const snapshot = {
  snapshotLedger: 100,
  snapshotTime: '2026-10-02T00:00:00.000Z',
  ledgerCloseSeconds: 5.8,
  gitSha: 'abc',
  network: 'mainnet' as const,
};

const ledger = { sequence: 64723256, closedAt: '2026-10-02T00:47:42Z' };

describe('buildLive', () => {
  it('reports only the ledger when there is no scan', () => {
    const live = buildLive(ledger, { summary: emptySummary(snapshot), scanned: false });
    expect(LiveResponse.parse(live)).toEqual(live);
    expect(live.latestLedger).toBe(64723256);
    expect(live.window.txFailed).toBeNull();
    expect(live.ledgerCloseSeconds).toBeNull();
    expect(live.horizonOk).toBe(true);
  });

  it('combines scan window numbers with the ledger', () => {
    const base = emptySummary(snapshot);
    const summary = {
      ...base,
      failures: {
        ...base.failures,
        windowStart: '2026-09-25T00:00:00.000Z',
        txScanned: 10,
        txFailed: 4,
        preventable: { total: 1, byCode: {} },
      },
    };
    const live = buildLive(null, { summary, scanned: true });
    expect(live.window).toEqual({ days: 7, txFailed: 4, preventable: 1, preventableShare: 0.25 });
    expect(live.ledgerCloseSeconds).toBe(5.8);
    expect(live.horizonOk).toBe(false);
  });
});
