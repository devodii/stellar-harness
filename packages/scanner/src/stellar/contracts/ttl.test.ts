import { describe, expect, it } from 'vitest';
import archived from './__fixtures__/rpc-ledger-entries-archived.json';
import router from './__fixtures__/rpc-ledger-entries-router.json';
import { classifyTtl, daysForLedgers, ledgersForDays } from './ttl';

const clock = { snapshotLedger: router.result.latestLedger, ledgerCloseSeconds: 5 };

describe('classifyTtl', () => {
  it('classifies a live instance with days left', () => {
    const status = classifyTtl(router.result.entries[0], clock);
    expect(status).toEqual({
      present: true,
      liveUntilLedgerSeq: 67234828,
      ledgersLeft: 67234828 - 64722837,
      daysLeft: 145.37,
      archived: false,
      expiring30d: false,
      expiring90d: false,
    });
  });

  it('treats a hot archived entry (liveUntil 0) as archived', () => {
    const status = classifyTtl(archived.result.entries[0], {
      snapshotLedger: archived.result.latestLedger,
      ledgerCloseSeconds: 5,
    });
    expect(status).toMatchObject({ present: true, archived: true, ledgersLeft: 0, daysLeft: 0 });
  });

  it('treats a missing entry as archived and not present', () => {
    expect(classifyTtl(undefined, clock)).toMatchObject({
      present: false,
      archived: true,
      liveUntilLedgerSeq: null,
      daysLeft: null,
    });
  });

  it('puts an entry expiring in 20 days in the 30 day bucket only', () => {
    const liveUntil = clock.snapshotLedger + ledgersForDays(20, 5);
    const status = classifyTtl({ key: 'k', xdr: '', liveUntilLedgerSeq: liveUntil }, clock);
    expect(status).toMatchObject({ expiring30d: true, expiring90d: false, archived: false });
  });

  it('puts an entry expiring in 60 days in the 90 day bucket only', () => {
    const liveUntil = clock.snapshotLedger + ledgersForDays(60, 5);
    const status = classifyTtl({ key: 'k', xdr: '', liveUntilLedgerSeq: liveUntil }, clock);
    expect(status).toMatchObject({ expiring30d: false, expiring90d: true });
  });

  it('treats liveUntil equal to the snapshot ledger as still live', () => {
    const status = classifyTtl(
      { key: 'k', xdr: '', liveUntilLedgerSeq: clock.snapshotLedger },
      clock,
    );
    expect(status).toMatchObject({ archived: false, ledgersLeft: 0, expiring30d: true });
  });
});

describe('ledger and day conversions', () => {
  it('converts 365 days to ledgers at 5 s', () => {
    expect(ledgersForDays(365, 5)).toBe(6_307_200);
  });

  it('converts ledgers back to days', () => {
    expect(daysForLedgers(6_307_200, 5)).toBe(365);
  });
});
