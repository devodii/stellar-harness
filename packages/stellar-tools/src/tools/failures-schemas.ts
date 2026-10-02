import { z } from 'zod';

export const AccountId = z.string().regex(/^G[A-Z2-7]{55}$/, 'Expected a G... account id');
export type AccountId = z.infer<typeof AccountId>;

export const TxHash = z
  .string()
  .regex(/^[0-9a-fA-F]{64}$/, 'Expected a 64 character hex transaction hash')
  .transform((hash) => hash.toLowerCase());

export const ResultCodes = z.object({
  tx: z.string(),
  ops: z.array(z.string()),
});
export type ResultCodes = z.infer<typeof ResultCodes>;

export const DecodedResultCodes = ResultCodes.extend({ feeBump: z.boolean() });
export type DecodedResultCodes = z.infer<typeof DecodedResultCodes>;

export const TimeBounds = z.object({ minTime: z.string(), maxTime: z.string() });
export type TimeBounds = z.infer<typeof TimeBounds>;

export const EnvelopeSummary = z.object({
  sourceAccount: z.string(),
  feeSource: z.string().optional(),
  sequence: z.string().optional(),
  maxFee: z.string(),
  operationCount: z.number().int().nonnegative(),
  memoType: z.string(),
  opTypes: z.array(z.string()),
  feeBump: z.boolean(),
  timeBounds: TimeBounds.optional(),
});
export type EnvelopeSummary = z.infer<typeof EnvelopeSummary>;
