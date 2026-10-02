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

export const ContractExecutableKind = z.enum(['wasm', 'stellar_asset', 'external', 'unknown']);
export type ContractExecutableKind = z.infer<typeof ContractExecutableKind>;

export const GetContractTtlInput = z.object({ contractId: ContractId });
export type GetContractTtlInput = z.infer<typeof GetContractTtlInput>;

export const TtlEntry = z.object({
  present: z.boolean(),
  liveUntilLedgerSeq: count.nullable(),
  ledgersLeft: z.number().int().nullable(),
  daysLeft: z.number().nullable(),
  archived: z.boolean(),
});
export type TtlEntry = z.infer<typeof TtlEntry>;

export const GetContractTtlOutput = z.object({
  contractId: ContractId,
  wasmHash: WasmHash.nullable(),
  instance: TtlEntry,
  code: TtlEntry,
  invocations: count.nullable(),
  snapshotLedger: count,
  ledgerCloseSeconds: z.number().positive(),
});
export type GetContractTtlOutput = z.infer<typeof GetContractTtlOutput>;

export const Footprint = z.object({
  readOnly: z.array(z.string()),
  readWrite: z.array(z.string()),
});
export type Footprint = z.infer<typeof Footprint>;

export const RentEstimate = z.object({
  minResourceFeeStroops: count,
  estimatedXlm: z.number().nonnegative(),
  unsignedXdr: z.string().min(1),
  footprint: Footprint,
  restorePreamble: z.object({ minResourceFeeStroops: count }).nullable(),
  latestLedger: count,
});
export type RentEstimate = z.infer<typeof RentEstimate>;

export const MAX_EXTEND_DAYS = 730;

export const SimulateExtendTtlInput = z.object({
  contractId: ContractId,
  days: z.number().int().positive().max(MAX_EXTEND_DAYS).default(365),
});
export type SimulateExtendTtlInput = z.infer<typeof SimulateExtendTtlInput>;

export const RestoreEntries = z.enum(['instance', 'code', 'both']);
export type RestoreEntries = z.infer<typeof RestoreEntries>;

export const SimulateRestoreInput = z.object({
  contractId: ContractId,
  entries: RestoreEntries.default('both'),
});
export type SimulateRestoreInput = z.infer<typeof SimulateRestoreInput>;

const SimulationResult = z.object({
  contractId: ContractId,
  minResourceFeeStroops: count,
  estimatedXlm: z.number().nonnegative(),
  unsignedXdr: z.string().min(1),
  footprint: Footprint,
});

export const SimulateExtendTtlOutput = SimulationResult.extend({
  days: z.number().int().positive(),
  extendToLedgers: z.number().int().positive(),
});
export type SimulateExtendTtlOutput = z.infer<typeof SimulateExtendTtlOutput>;

export const SimulateRestoreOutput = SimulationResult.extend({
  entries: RestoreEntries,
});
export type SimulateRestoreOutput = z.infer<typeof SimulateRestoreOutput>;
