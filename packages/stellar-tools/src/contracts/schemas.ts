import { z } from 'zod';

export const ContractId = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, 'Expected a Stellar contract address (C...)');
export type ContractId = z.infer<typeof ContractId>;

export const AccountId = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Expected a Stellar account address (G...)');
export type AccountId = z.infer<typeof AccountId>;

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

export const GetContractTtlOutput = z.object({
  contractId: ContractId,
  latestLedger: count,
  ledgerCloseSeconds: z.number().positive(),
  executable: ContractExecutableKind,
  wasmHash: WasmHash.nullable(),
  instance: TtlStatus,
  code: TtlStatus.nullable(),
  invocations: count.nullable(),
  subinvocations: count.nullable(),
  sourceValidation: z.string().nullable(),
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
  unsignedXdr: z.string(),
  footprint: Footprint,
  restorePreamble: z.object({ minResourceFeeStroops: count }).nullable(),
  latestLedger: count,
});
export type RentEstimate = z.infer<typeof RentEstimate>;

export const SimulateExtendTtlInput = z.object({
  contractId: ContractId,
  days: z.number().int().min(1).max(3650).default(365),
  sourceAccount: AccountId.optional(),
});

export const SimulateExtendTtlOutput = RentEstimate.extend({
  contractId: ContractId,
  days: z.number().int().positive(),
  extendToLedgers: count,
  sourceAccount: AccountId,
  wasmHash: WasmHash.nullable(),
});
export type SimulateExtendTtlOutput = z.infer<typeof SimulateExtendTtlOutput>;

export const SimulateRestoreInput = z.object({
  contractId: ContractId,
  sourceAccount: AccountId.optional(),
});

export const SimulateRestoreOutput = RentEstimate.extend({
  contractId: ContractId,
  sourceAccount: AccountId,
  wasmHash: WasmHash.nullable(),
});
export type SimulateRestoreOutput = z.infer<typeof SimulateRestoreOutput>;
