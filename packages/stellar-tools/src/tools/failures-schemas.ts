import { Plan } from '@harness/schema';
import { z } from 'zod';

export const AccountAddress = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Expected a G... account address');
export const TxHash = z.string().regex(/^[0-9a-fA-F]{64}$/, 'Expected a 64 character hex hash');
export const AssetId = z
  .string()
  .regex(/^(XLM|native|[A-Za-z0-9]{1,12}:G[A-Z2-7]{55})$/, 'Expected XLM, native or CODE:ISSUER');
export const DecimalAmount = z.string().regex(/^\d+(\.\d{1,7})?$/, 'Expected a decimal amount');
export const Stroops = z.number().int().nonnegative();
export const LedgerSeq = z.number().int().nonnegative();
export const IsoTime = z.iso.datetime();

export const ResultCodes = z.object({
  tx: z.string().min(1),
  ops: z.array(z.string()),
});
export type ResultCodes = z.infer<typeof ResultCodes>;

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

export const GetTransactionInput = z.object({ hash: TxHash });
export type GetTransactionInput = z.infer<typeof GetTransactionInput>;

export const MemoType = z.enum(['none', 'text', 'id', 'hash', 'return']);

export const Timebounds = z.object({
  minTime: IsoTime.nullable(),
  maxTime: IsoTime.nullable(),
});

export const TransactionOperation = z.object({
  type: z.string(),
  source: AccountAddress.optional(),
});

export const FeeBump = z.object({
  feeSource: AccountAddress,
  innerHash: TxHash,
});

export const GetTransactionOutput = z.object({
  hash: TxHash,
  ledger: LedgerSeq,
  createdAt: IsoTime,
  successful: z.boolean(),
  source: AccountAddress,
  feeCharged: Stroops,
  maxFee: Stroops,
  operationCount: z.number().int().nonnegative(),
  operations: z.array(TransactionOperation),
  memoType: MemoType,
  timebounds: Timebounds.nullable(),
  resultCodes: ResultCodes,
  feeBump: FeeBump.nullable(),
});
export type GetTransactionOutput = z.infer<typeof GetTransactionOutput>;

export const BuildPaymentPreflightInput = z.object({
  from: AccountAddress,
  to: AccountAddress,
  asset: AssetId,
  amount: DecimalAmount,
});
export type BuildPaymentPreflightInput = z.infer<typeof BuildPaymentPreflightInput>;

export const PREFLIGHT_CHECKS = [
  'source_exists',
  'destination_exists',
  'source_trustline',
  'destination_trustline',
  'destination_authorized',
  'source_balance',
  'source_reserve',
  'destination_limit',
] as const;
export const PreflightCheckName = z.enum(PREFLIGHT_CHECKS);
export type PreflightCheckName = z.infer<typeof PreflightCheckName>;

export const PreflightCheck = z.object({
  name: PreflightCheckName,
  ok: z.boolean(),
  detail: z.string(),
});
export type PreflightCheck = z.infer<typeof PreflightCheck>;

export const PreflightBlocker = z.object({
  code: z.string(),
  fix: z.string(),
});
export type PreflightBlocker = z.infer<typeof PreflightBlocker>;

export const BuildPaymentPreflightOutput = z.object({
  ok: z.boolean(),
  blockers: z.array(PreflightBlocker),
  checks: z.array(PreflightCheck),
  alternative: Plan.optional(),
});
export type BuildPaymentPreflightOutput = z.infer<typeof BuildPaymentPreflightOutput>;
