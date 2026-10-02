import { z } from 'zod';
import { AccountAddress, DecimalAmount } from './common';

export const GetAccountInput = z.object({ address: AccountAddress });
export type GetAccountInput = z.infer<typeof GetAccountInput>;

export const AccountBalance = z.object({
  asset: z.string(),
  balance: DecimalAmount,
  limit: DecimalAmount.optional(),
});
export type AccountBalance = z.infer<typeof AccountBalance>;

export const AccountThresholds = z.object({
  low: z.number().int().min(0).max(255),
  med: z.number().int().min(0).max(255),
  high: z.number().int().min(0).max(255),
});

export const AccountSigner = z.object({
  key: z.string(),
  weight: z.number().int().min(0).max(255),
});

export const AccountFlags = z.object({
  authRequired: z.boolean(),
  authRevocable: z.boolean(),
  authImmutable: z.boolean(),
  authClawbackEnabled: z.boolean(),
});

export const GetAccountOutput = z.object({
  address: AccountAddress,
  exists: z.boolean(),
  sequence: z.string().regex(/^\d+$/).nullable(),
  balances: z.array(AccountBalance),
  thresholds: AccountThresholds,
  signers: z.array(AccountSigner),
  flags: AccountFlags,
  homeDomain: z.string().nullable(),
  subentryCount: z.number().int().nonnegative(),
  numSponsoring: z.number().int().nonnegative(),
  numSponsored: z.number().int().nonnegative(),
});
export type GetAccountOutput = z.infer<typeof GetAccountOutput>;
