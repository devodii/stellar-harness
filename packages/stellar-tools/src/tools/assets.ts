import type { HorizonAccount, HorizonBalance } from '../ports';

export type ParsedAsset = { native: true } | { native: false; code: string; issuer: string };

export const NATIVE_ASSET = 'XLM';

export const parseAsset = (asset: string): ParsedAsset => {
  if (asset === NATIVE_ASSET || asset === 'native') return { native: true };
  const [code, issuer] = asset.split(':');
  if (!code || !issuer) throw new Error(`Invalid asset "${asset}", expected XLM or CODE:ISSUER`);
  return { native: false, code, issuer };
};

export const assetId = (asset: ParsedAsset): string =>
  asset.native ? NATIVE_ASSET : `${asset.code}:${asset.issuer}`;

export const balanceAsset = (balance: HorizonBalance): string => {
  if (balance.asset_type === 'native') return NATIVE_ASSET;
  if (balance.asset_type === 'liquidity_pool_shares') {
    return `pool:${balance.liquidity_pool_id ?? 'unknown'}`;
  }
  return `${balance.asset_code}:${balance.asset_issuer}`;
};

export const findBalance = (
  account: HorizonAccount,
  asset: ParsedAsset,
): HorizonBalance | undefined =>
  account.balances.find((balance) =>
    asset.native
      ? balance.asset_type === 'native'
      : balance.asset_code === asset.code && balance.asset_issuer === asset.issuer,
  );
