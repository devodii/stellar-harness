import { z } from 'zod';
import { ContractAddress, LedgerSeq, WasmHash } from './common';

export const GetContractTtlInput = z.object({ contractId: ContractAddress });
export type GetContractTtlInput = z.infer<typeof GetContractTtlInput>;

export const TtlEntry = z.object({
  present: z.boolean(),
  liveUntilLedgerSeq: LedgerSeq.nullable(),
  ledgersLeft: z.number().int().nullable(),
  daysLeft: z.number().nullable(),
  archived: z.boolean(),
});
export type TtlEntry = z.infer<typeof TtlEntry>;

export const GetContractTtlOutput = z.object({
  contractId: ContractAddress,
  wasmHash: WasmHash.nullable(),
  instance: TtlEntry,
  code: TtlEntry,
  invocations: z.number().int().nonnegative().nullable(),
  snapshotLedger: LedgerSeq,
  ledgerCloseSeconds: z.number().positive(),
});
export type GetContractTtlOutput = z.infer<typeof GetContractTtlOutput>;
