import { z } from 'zod';
import { ContractAddress, Stroops } from './common';

export const MAX_EXTEND_DAYS = 730;

export const SimulateExtendTtlInput = z.object({
  contractId: ContractAddress,
  days: z.number().int().positive().max(MAX_EXTEND_DAYS).default(365),
});
export type SimulateExtendTtlInput = z.infer<typeof SimulateExtendTtlInput>;

export const RestoreEntries = z.enum(['instance', 'code', 'both']);
export type RestoreEntries = z.infer<typeof RestoreEntries>;

export const SimulateRestoreInput = z.object({
  contractId: ContractAddress,
  entries: RestoreEntries.default('both'),
});
export type SimulateRestoreInput = z.infer<typeof SimulateRestoreInput>;

export const Footprint = z.object({
  readOnly: z.array(z.string()),
  readWrite: z.array(z.string()),
});
export type Footprint = z.infer<typeof Footprint>;

const SimulationResult = z.object({
  contractId: ContractAddress,
  minResourceFeeStroops: Stroops,
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
