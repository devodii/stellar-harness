import { z } from 'zod';
import { ContractId, TtlStatus, WasmHash } from '../../stellar/contracts';

const count = z.number().int().nonnegative();

export const ScfTag = z.object({
  slug: z.string(),
  name: z.string(),
  round: z.number().int().nullable(),
});
export type ScfTag = z.infer<typeof ScfTag>;

export const ContractRow = z.object({
  contract: ContractId,
  wasm: WasmHash.nullable(),
  asset: z.string().nullable(),
  created: z.number().int(),
  creator: z.string().nullable(),
  invocations: count,
  subinvocations: count,
  familySize: count.nullable(),
  familyRank: count.nullable(),
  instance: TtlStatus.nullable(),
  code: TtlStatus.nullable(),
  scf: ScfTag.nullable(),
});
export type ContractRow = z.infer<typeof ContractRow>;
