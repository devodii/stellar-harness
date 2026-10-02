import { describe, expect, it } from 'vitest';
import type { HorizonAccount } from '../ports';
import manyFixture from './__fixtures__/horizon-account-many-trustlines.json';
import holderFixture from './__fixtures__/horizon-account-usdc-holder.json';
import {
  minimumBalanceStroops,
  reserveEntries,
  reserveShortfallStroops,
  spendableNativeStroops,
} from './reserve';

const holder: HorizonAccount = holderFixture;
const many: HorizonAccount = manyFixture;

describe('reserve math', () => {
  it('counts (2 + subentries + sponsoring - sponsored) base reserves', () => {
    expect(reserveEntries(holder)).toBe(5n);
    expect(minimumBalanceStroops(holder)).toBe(25_000_000n);
    expect(reserveEntries(many)).toBe(2n + 672n + 12n);
    expect(reserveEntries({ ...holder, num_sponsored: 2 })).toBe(3n);
  });

  it('subtracts selling liabilities and the minimum balance from spendable XLM', () => {
    expect(spendableNativeStroops(holder)).toBe(29_524_181n - 25_000_000n);
    const withLiabilities: HorizonAccount = {
      ...holder,
      balances: holder.balances.map((b) =>
        b.asset_type === 'native' ? { ...b, selling_liabilities: '1.0000000' } : b,
      ),
    };
    expect(spendableNativeStroops(withLiabilities)).toBe(29_524_181n - 25_000_000n - 10_000_000n);
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
