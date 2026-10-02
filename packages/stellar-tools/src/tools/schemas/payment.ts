import { Plan } from '@harness/schema';
import { z } from 'zod';
import { AccountAddress, AssetId, DecimalAmount } from './common';

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
