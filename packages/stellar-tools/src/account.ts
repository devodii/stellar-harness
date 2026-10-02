import type { Clients, HorizonAccount } from './clients';

export type Trustline = { asset: string; balance: string; limit: string };

export type AccountView = {
  address: string;
  exists: boolean;
  xlm: string | null;
  sequence: string | null;
  signers: number;
  trustlines: Trustline[];
};

export const assetName = (code: string | undefined, issuer: string | undefined): string =>
  code && issuer ? `${code}:${issuer}` : 'XLM';

export const toAccountView = (address: string, account: HorizonAccount | null): AccountView => {
  if (!account) {
    return { address, exists: false, xlm: null, sequence: null, signers: 0, trustlines: [] };
  }
  return {
    address,
    exists: true,
    xlm: account.balances.find((b) => b.asset_type === 'native')?.balance ?? '0',
    sequence: account.sequence,
    signers: account.signers.filter((signer) => signer.weight > 0).length,
    trustlines: account.balances
      .filter((b) => b.asset_type !== 'native')
      .map((b) => ({
        asset: assetName(b.asset_code, b.asset_issuer),
        balance: b.balance,
        limit: b.limit ?? '0',
      })),
  };
};

export const getAccount = async (clients: Clients, address: string): Promise<AccountView> =>
  toAccountView(address, await clients.loadAccount(address));
