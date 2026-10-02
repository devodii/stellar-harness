import { describe, expect, it, vi } from 'vitest';
import { readLatestLedger } from './latest-ledger';

const ledger = { sequence: 4979192, closedAt: '2026-10-02T06:39:07.000Z' };
const down = () => Promise.reject(new Error('connection refused'));

describe('readLatestLedger', () => {
  it('prefers horizon', async () => {
    const rpc = vi.fn(async () => ledger);
    const reading = await readLatestLedger({ horizon: async () => ledger, rpc });
    expect(reading).toEqual({ ...ledger, source: 'horizon' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('falls back to rpc when horizon fails', async () => {
    const onFailure = vi.fn();
    const reading = await readLatestLedger({ horizon: down, rpc: async () => ledger }, onFailure);
    expect(reading).toEqual({ ...ledger, source: 'rpc' });
    expect(onFailure).toHaveBeenCalledWith('horizon', expect.any(Error));
  });

  it('returns null when every source fails', async () => {
    const onFailure = vi.fn();
    expect(await readLatestLedger({ horizon: down, rpc: down }, onFailure)).toBeNull();
    expect(onFailure).toHaveBeenCalledTimes(2);
  });
});
