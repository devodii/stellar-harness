import { z } from 'zod';

export const DecodedResultCodes = z.object({
  tx: z.string(),
  ops: z.array(z.string()),
  feeBump: z.boolean(),
});
export type DecodedResultCodes = z.infer<typeof DecodedResultCodes>;

export const EnvelopeTimeBounds = z.object({
  minTime: z.string().regex(/^\d+$/),
  maxTime: z.string().regex(/^\d+$/),
});
export type EnvelopeTimeBounds = z.infer<typeof EnvelopeTimeBounds>;

export const EnvelopeOperation = z.object({
  type: z.string(),
  source: z.string().optional(),
  destination: z.string().optional(),
  asset: z.string().optional(),
  amount: z.string().optional(),
});
export type EnvelopeOperation = z.infer<typeof EnvelopeOperation>;

export const EnvelopeSummary = z.object({
  sourceAccount: z.string(),
  feeSource: z.string().optional(),
  innerHash: z.string().optional(),
  sequence: z.string().optional(),
  maxFee: z.string(),
  operationCount: z.number().int().nonnegative(),
  memoType: z.string(),
  opTypes: z.array(z.string()),
  operations: z.array(EnvelopeOperation).optional(),
  feeBump: z.boolean(),
  timeBounds: EnvelopeTimeBounds.optional(),
});
export type EnvelopeSummary = z.infer<typeof EnvelopeSummary>;
