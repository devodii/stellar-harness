import { z } from 'zod';
import { AnchorStage } from '../../schema';

const optionalText = z.string().nullable().optional();

export const StellarlightPartner = z.object({
  slug: z.string(),
  name: z.string(),
  partnerType: z.string().optional(),
  websiteUrl: optionalText,
  tomlSourceUrl: optionalText,
  tomlFetchedAt: optionalText,
  seps: z.array(z.string()).nullable().optional(),
  rampTypes: z.array(z.string()).nullable().optional(),
  country: optionalText,
  regions: z.array(z.string()).nullable().optional(),
});
export type StellarlightPartner = z.infer<typeof StellarlightPartner>;

export const PartnersResponse = z.object({ partners: z.array(z.unknown()) });

export const StellarlightProject = z.object({
  name: z.string(),
  slug: z.string(),
  links: z.object({ website: z.string().optional() }).nullable().optional(),
  scfAwardedRounds: z.array(z.number().int()).nullable().optional(),
  types: z.array(z.string()).nullable().optional(),
  anchorProfile: z
    .object({
      slug: z.string().optional(),
      country: optionalText,
      regions: z.array(z.string()).nullable().optional(),
      seps: z.array(z.string()).nullable().optional(),
    })
    .nullable()
    .optional(),
});
export type StellarlightProject = z.infer<typeof StellarlightProject>;

export const ProjectsResponse = z.object({
  meta: z.object({
    counts: z.object({ returned: z.number().int(), total: z.number().int().nullable() }),
  }),
  projects: z.array(z.unknown()),
});

export const ExpertAsset = z.object({
  asset: z.string(),
  code: z.string().optional(),
  domain: z.string().optional(),
});
export type ExpertAsset = z.infer<typeof ExpertAsset>;

export const ExpertAssetsResponse = z.object({
  _embedded: z.object({ records: z.array(z.unknown()) }),
});

export const DOMAIN_SOURCES = [
  'stellarlight_partner',
  'stellarlight_project',
  'scf_recap',
  'stellar_expert_asset',
  'transitive',
] as const;
export const DomainSource = z.enum(DOMAIN_SOURCES);
export type DomainSource = z.infer<typeof DomainSource>;

export const AnchorDomain = z.object({
  domain: z.string(),
  name: z.string().nullable(),
  country: z.string().nullable(),
  countryName: z.string().nullable(),
  regions: z.array(z.string()),
  seps: z.array(z.string()),
  scfRounds: z.array(z.number().int()),
  sources: z.array(DomainSource),
  slugs: z.array(z.string()),
  websiteUrl: z.string().nullable(),
  tomlUrl: z.string(),
});
export type AnchorDomain = z.infer<typeof AnchorDomain>;

export const AnchorProbeRow = z.object({
  domain: z.string(),
  stage: AnchorStage,
  ok: z.boolean(),
  status: z.number().int().nullable(),
  ms: z.number().nonnegative(),
  error: z.string().nullable(),
});
export type AnchorProbeRow = z.infer<typeof AnchorProbeRow>;

export const AnchorCensusState = z.object({
  lastDomain: z.string().nullable(),
  completed: z.array(z.string()),
});
export type AnchorCensusState = z.infer<typeof AnchorCensusState>;
