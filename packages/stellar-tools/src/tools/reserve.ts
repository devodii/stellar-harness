import type { HorizonAccount, HorizonBalance } from '../ports';
import { toStroops } from './amount';

export const BASE_RESERVE_STROOPS = 5_000_000n;

export const nativeBalance = (account: HorizonAccount): HorizonBalance | undefined =>
  account.balances.find((balance) => balance.asset_type === 'native');

export const reserveEntries = (account: HorizonAccount, extraSubentries = 0): bigint =>
  2n +
  BigInt(account.subentry_count + extraSubentries) +
  BigInt(account.num_sponsoring ?? 0) -
  BigInt(account.num_sponsored ?? 0);

export const minimumBalanceStroops = (account: HorizonAccount, extraSubentries = 0): bigint =>
  reserveEntries(account, extraSubentries) * BASE_RESERVE_STROOPS;

export const spendableNativeStroops = (account: HorizonAccount): bigint => {
  const native = nativeBalance(account);
  if (!native) return 0n;
  const selling = toStroops(native.selling_liabilities ?? '0');
  return toStroops(native.balance) - selling - minimumBalanceStroops(account);
};

export const reserveShortfallStroops = (account: HorizonAccount, extraSubentries = 1): bigint => {
  const native = nativeBalance(account);
  const available = native
    ? toStroops(native.balance) - toStroops(native.selling_liabilities ?? '0')
    : 0n;
  const shortfall = minimumBalanceStroops(account, extraSubentries) - available;
  return shortfall > 0n ? shortfall : 0n;
};
