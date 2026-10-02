import { z } from 'zod';
import { ResultCodes } from '../../explain/explain';
import { AccountAddress, IsoTime, LedgerSeq, Stroops, TxHash } from './common';

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
