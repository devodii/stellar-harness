import { describe, expect, it } from 'vitest';
import holderFixture from '../census/failures/__fixtures__/horizon-account-usdc-holder.json';
import type { HorizonAccount } from '../stellar/contracts';
import { minimumBalanceStroops, reserveEntries, reserveShortfallStroops } from './reserve';

const holder: HorizonAccount = holderFixture;

describe('reserve math', () => {
  it('counts (2 + subentries + sponsoring - sponsored) base reserves', () => {
    expect(reserveEntries(holder)).toBe(5n);
    expect(minimumBalanceStroops(holder)).toBe(25_000_000n);
    expect(reserveEntries({ ...holder, num_sponsored: 2 })).toBe(3n);
  });

  it('reports the XLM needed to add one more subentry', () => {
    expect(reserveShortfallStroops(holder)).toBe(30_000_000n - 29_524_181n);
    expect(reserveShortfallStroops(holder, 0)).toBe(0n);
    const poor: HorizonAccount = {
      ...holder,
      balances: holder.balances.map((b) =>
        b.asset_type === 'native' ? { ...b, balance: '2.5000000' } : b,
      ),
    };
    expect(reserveShortfallStroops(poor)).toBe(5_000_000n);
  });
});
