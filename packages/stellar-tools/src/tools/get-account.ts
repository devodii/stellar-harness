import { accountWithRpcFallback } from '../core/account-entry';
import type { HorizonAccount, RpcPort } from '../ports';
import { fail } from '../tool';
import { balanceAsset } from './assets';
import { defineNamedTool } from './define';
import type { HorizonToolContext } from './network-context';
import type { GetAccountOutput } from './schemas';

export const missingAccount = (address: string): GetAccountOutput => ({
  address,
  exists: false,
  sequence: null,
  balances: [],
  thresholds: { low: 0, med: 0, high: 0 },
  signers: [],
  flags: {
    authRequired: false,
    authRevocable: false,
    authImmutable: false,
    authClawbackEnabled: false,
  },
  homeDomain: null,
  subentryCount: 0,
  numSponsoring: 0,
  numSponsored: 0,
});

export const toAccountOutput = (address: string, account: HorizonAccount): GetAccountOutput => ({
  address,
  exists: true,
  sequence: account.sequence,
  balances: account.balances.map((balance) => ({
    asset: balanceAsset(balance),
    balance: balance.balance,
    ...(balance.limit !== undefined ? { limit: balance.limit } : {}),
  })),
  thresholds: {
    low: account.thresholds.low_threshold,
    med: account.thresholds.med_threshold,
    high: account.thresholds.high_threshold,
  },
  signers: account.signers.map(({ key, weight }) => ({ key, weight })),
  flags: {
    authRequired: account.flags.auth_required,
    authRevocable: account.flags.auth_revocable,
    authImmutable: account.flags.auth_immutable,
    authClawbackEnabled: account.flags.auth_clawback_enabled,
  },
  homeDomain: account.home_domain || null,
  subentryCount: account.subentry_count,
  numSponsoring: account.num_sponsoring ?? 0,
  numSponsored: account.num_sponsored ?? 0,
});

export type GetAccountContext = HorizonToolContext & {
  rpc?: Pick<RpcPort, 'getLedgerEntries'>;
};

export const getAccount = defineNamedTool(
  'getAccount',
  async ({ address }, ctx: GetAccountContext) => {
    const result = ctx.rpc
      ? await accountWithRpcFallback(ctx.horizon, ctx.rpc, address)
      : await ctx.horizon.account(address);
    if (!result.ok) return fail(result.error.code, result.error.message, result.error.meta);
    return result.value ? toAccountOutput(address, result.value) : missingAccount(address);
  },
);
