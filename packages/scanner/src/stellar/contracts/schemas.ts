import { z } from 'zod';

export const ContractId = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, 'Expected a Stellar contract address (C...)');
export type ContractId = z.infer<typeof ContractId>;

export const WasmHash = z.string().regex(/^[0-9a-f]{64}$/, 'Expected a hex wasm hash');
export type WasmHash = z.infer<typeof WasmHash>;

const count = z.number().int().nonnegative();

export const TtlStatus = z.object({
  present: z.boolean(),
  liveUntilLedgerSeq: count.nullable(),
  ledgersLeft: count.nullable(),
  daysLeft: z.number().nonnegative().nullable(),
  archived: z.boolean(),
  expiring30d: z.boolean(),
  expiring90d: z.boolean(),
});
export type TtlStatus = z.infer<typeof TtlStatus>;

export const ExpertContractValidation = z.looseObject({
  status: z.string(),
  repository: z.string().optional(),
  commit: z.string().optional(),
});

export const ExpertContract = z.looseObject({
  contract: ContractId,
  created: z.number().int(),
  creator: z.string().optional(),
  wasm: WasmHash.optional(),
  asset: z.string().optional(),
  invocations: count.default(0),
  subinvocation: count.default(0),
  events: count.default(0),
  errors: count.default(0),
  paging_token: z.string().optional(),
  code: z.string().optional(),
  token_name: z.string().optional(),
  features: z.array(z.string()).optional(),
  storage_entries: count.optional(),
  validation: ExpertContractValidation.optional(),
});
export type ExpertContract = z.infer<typeof ExpertContract>;

export const Footprint = z.object({
  readOnly: z.array(z.string()),
  readWrite: z.array(z.string()),
});
export type Footprint = z.infer<typeof Footprint>;

export const RentEstimate = z.object({
  minResourceFeeStroops: count,
  estimatedXlm: z.number().nonnegative(),
  footprint: Footprint,
  restorePreamble: z.object({ minResourceFeeStroops: count }).nullable(),
  latestLedger: count,
});
export type RentEstimate = z.infer<typeof RentEstimate>;
