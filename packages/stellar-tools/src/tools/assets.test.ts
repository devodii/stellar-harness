import { describe, expect, it } from 'vitest';
import type { HorizonAccount } from '../ports';
import holderFixture from './__fixtures__/horizon-account-usdc-holder.json';
import { assetId, balanceAsset, findBalance, parseAsset } from './assets';

const USDC = 'USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
const holder: HorizonAccount = holderFixture;

describe('assets', () => {
  it('parses XLM, native and CODE:ISSUER', () => {
    expect(parseAsset('XLM')).toEqual({ native: true });
    expect(parseAsset('native')).toEqual({ native: true });
    expect(parseAsset(USDC)).toEqual({
      native: false,
      code: 'USDC',
      issuer: 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN',
    });
    expect(() => parseAsset('USDC')).toThrow();
  });

  it('round trips asset ids', () => {
    expect(assetId(parseAsset(USDC))).toBe(USDC);
    expect(assetId(parseAsset('native'))).toBe('XLM');
  });

  it('names balances and finds them on an account', () => {
    expect(holder.balances.map(balanceAsset)).toEqual([
      USDC,
      'VELO:GDM4RQUQQUVSKQA7S6EM7XBZP3FCGH4Q7CL6TABQ7B2BEJ5ERARM2M5M',
      'XLM',
    ]);
    expect(
      balanceAsset({ asset_type: 'liquidity_pool_shares', liquidity_pool_id: 'abc', balance: '1' }),
    ).toBe('pool:abc');
    expect(findBalance(holder, parseAsset(USDC))?.balance).toBe('5.8223544');
    expect(findBalance(holder, parseAsset('XLM'))?.balance).toBe('2.9524181');
    expect(findBalance(holder, parseAsset(`EURC:${'G'.padEnd(56, 'A')}`))).toBeUndefined();
  });
});
