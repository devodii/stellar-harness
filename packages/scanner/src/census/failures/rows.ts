import { z } from 'zod';

export const FailedTxCodes = z.object({ tx: z.string(), ops: z.array(z.string()) });
export type FailedTxCodes = z.infer<typeof FailedTxCodes>;

export const FailedPayment = z.object({
  destination: z.string(),
  asset: z.string().optional(),
  amount: z.string().optional(),
});
export type FailedPayment = z.infer<typeof FailedPayment>;

export const FailedTx = z.object({
  hash: z.string(),
  ledger: z.number().int().positive(),
  sourceAccount: z.string(),
  feeCharged: z.string(),
  maxFee: z.string(),
  operationCount: z.number().int().nonnegative(),
  resultCodes: FailedTxCodes,
  feeBump: z.boolean(),
  memoType: z.string(),
  opTypes: z.array(z.string()),
  payment: FailedPayment.optional(),
});
export type FailedTx = z.infer<typeof FailedTx>;

export const LedgerTotal = z.object({
  ledger: z.number().int().positive(),
  txCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
});
export type LedgerTotal = z.infer<typeof LedgerTotal>;

export const DERIVED_FAILED_TX = 'failed_tx';
export const DERIVED_LEDGER_TOTALS = 'ledger_totals';
