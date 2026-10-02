import { ResultCodes } from '@harness/stellar-tools';
import { z } from 'zod';

export const FailedTx = z.object({
  hash: z.string(),
  ledger: z.number().int().positive(),
  sourceAccount: z.string(),
  feeCharged: z.string(),
  maxFee: z.string(),
  operationCount: z.number().int().nonnegative(),
  resultCodes: ResultCodes,
  feeBump: z.boolean(),
  memoType: z.string(),
  opTypes: z.array(z.string()),
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
