import { ok } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import type { Snapshot } from '../../schema';
import page from './__fixtures__/rpc-get-transactions-page.json';
import { asRpcTransaction, fakeRpc } from './__tests__/fakes';
import { parseWindowSeconds, probeRetention, resolveWindow } from './window';

const snapshot: Snapshot = {
  snapshotLedger: 64_722_809,
  snapshotTime: '2026-10-02T00:10:27.000Z',
  ledgerCloseSeconds: 5,
  gitSha: 'test',
  network: 'mainnet',
};

const retention = { oldestLedger: 64_601_849, latestLedger: 64_722_813 };

describe('parseWindowSeconds', () => {
  it('parses unit suffixes and passes numbers through', () => {
    expect(parseWindowSeconds('7d')).toBe(604_800);
    expect(parseWindowSeconds('24h')).toBe(86_400);
    expect(parseWindowSeconds('30m')).toBe(1800);
    expect(parseWindowSeconds(60)).toBe(60);
  });

  it('rejects unknown formats', () => {
    expect(() => parseWindowSeconds('7 days')).toThrow();
  });
});

describe('resolveWindow', () => {
  it('converts a 1d window to ledgers ending at the snapshot', () => {
    const result = resolveWindow({ windowSeconds: 86_400, snapshot, retention });
    expect(result).toMatchObject({
      ok: true,
      value: {
        startLedger: 64_722_809 - 17_280 + 1,
        endLedger: 64_722_809,
        ledgers: 17_280,
        clamped: false,
        endTime: '2026-10-02T00:10:27.000Z',
        startTime: '2026-10-01T00:10:32.000Z',
      },
    });
  });

  it('clamps a 7d window to retention plus the safety margin and records it', () => {
    const result = resolveWindow({
      windowSeconds: 604_800,
      snapshot,
      retention,
      retentionMarginLedgers: 720,
    });
    expect(result).toMatchObject({
      ok: true,
      value: {
        requestedStartLedger: 64_722_809 - 120_960 + 1,
        startLedger: 64_601_849 + 720,
        clamped: true,
        clampReason: 'retention',
        retentionOldestLedger: 64_601_849,
      },
    });
  });

  it('ends at the RPC latest ledger when the snapshot is ahead of it', () => {
    const result = resolveWindow({
      windowSeconds: 50,
      snapshot,
      retention: { ...retention, latestLedger: 64_722_800 },
    });
    expect(result).toMatchObject({ ok: true, value: { endLedger: 64_722_800, ledgers: 10 } });
  });

  it('applies a ledger limit', () => {
    const result = resolveWindow({ windowSeconds: 86_400, snapshot, retention, limitLedgers: 50 });
    expect(result).toMatchObject({
      ok: true,
      value: { startLedger: 64_722_760, ledgers: 50, clampReason: 'limit' },
    });
  });

  it('fails when retention does not reach the snapshot', () => {
    const result = resolveWindow({
      windowSeconds: 86_400,
      snapshot,
      retention: { oldestLedger: 64_722_800, latestLedger: 64_722_813 },
    });
    expect(result.ok).toBe(false);
  });
});

describe('probeRetention', () => {
  it('reads oldest and latest ledger from a one transaction page', async () => {
    const calls: unknown[] = [];
    const rpc = fakeRpc({
      getTransactions: async (params) => {
        calls.push(params);
        return ok({
          transactions: page.transactions.slice(0, 1).map(asRpcTransaction),
          cursor: page.cursor,
          latestLedger: page.latestLedger,
          oldestLedger: page.oldestLedger,
        });
      },
    });
    const result = await probeRetention(rpc, 64_722_809);
    expect(result).toEqual(
      ok({ oldestLedger: page.oldestLedger, latestLedger: page.latestLedger }),
    );
    expect(calls).toEqual([{ startLedger: 64_722_799, limit: 1 }]);
  });
});
