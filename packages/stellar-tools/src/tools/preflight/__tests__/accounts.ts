import type { HorizonAccount, HorizonBalance } from '../../../ports';
import singleSigFixture from '../../__fixtures__/horizon-account-single-sig.json';
import holderFixture from '../../__fixtures__/horizon-account-usdc-holder.json';
import issuerFixture from '../../__fixtures__/horizon-account-usdc-issuer.json';

export const USDC_ISSUER = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN';
export const USDC = `USDC:${USDC_ISSUER}`;
export const MISSING = 'GADQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOBYHA4DQOZPI';

export const holder: HorizonAccount = holderFixture;
export const issuer: HorizonAccount = issuerFixture;
export const noTrustline: HorizonAccount = singleSigFixture;

const isUsdc = (balance: HorizonBalance) =>
  balance.asset_code === 'USDC' && balance.asset_issuer === USDC_ISSUER;

export const withBalance = (
  account: HorizonAccount,
  match: (balance: HorizonBalance) => boolean,
  patch: Partial<HorizonBalance>,
): HorizonAccount => ({
  ...account,
  balances: account.balances.map((balance) =>
    match(balance) ? { ...balance, ...patch } : balance,
  ),
});

export const fundedHolder = withBalance(
  withBalance(holder, isUsdc, { balance: '100.0000000', selling_liabilities: '0.0000000' }),
  (b) => b.asset_type === 'native',
  { balance: '50.0000000' },
);

export const withUsdcLine = (
  account: HorizonAccount,
  line: Partial<HorizonBalance> = {},
): HorizonAccount => ({
  ...account,
  subentry_count: account.subentry_count + 1,
  balances: [
    {
      asset_type: 'credit_alphanum4',
      asset_code: 'USDC',
      asset_issuer: USDC_ISSUER,
      balance: '0.0000000',
      limit: '922337203685.4775807',
      buying_liabilities: '0.0000000',
      selling_liabilities: '0.0000000',
      is_authorized: true,
      ...line,
    },
    ...account.balances,
  ],
});
