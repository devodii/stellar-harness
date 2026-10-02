import { z } from 'zod';
import { ContractAddress } from './common';

export const SearchEcosystemInput = z.object({
  query: z.string().trim().min(1),
  limit: z.number().int().positive().max(20).default(10),
});
export type SearchEcosystemInput = z.infer<typeof SearchEcosystemInput>;

export const EcosystemProject = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  website: z.url().nullable(),
  scfAwarded: z.boolean(),
  scfRound: z.number().int().nullable(),
  contracts: z.array(ContractAddress),
});
export type EcosystemProject = z.infer<typeof EcosystemProject>;

export const EcosystemRepo = z.object({
  name: z.string(),
  url: z.url(),
  description: z.string().nullable(),
  score: z.number().nullable(),
  mainnetContractId: ContractAddress.nullable(),
});
export type EcosystemRepo = z.infer<typeof EcosystemRepo>;

export const SearchEcosystemOutput = z.object({
  query: z.string(),
  projects: z.array(EcosystemProject),
  repos: z.array(EcosystemRepo),
});
export type SearchEcosystemOutput = z.infer<typeof SearchEcosystemOutput>;
