import { AnchorStage, Finding } from '@harness/schema';
import { z } from 'zod';
import { HomeDomain } from './common';

export const ProbeAnchorInput = z.object({
  domain: HomeDomain,
  runAnchorTests: z.boolean().default(false),
});
export type ProbeAnchorInput = z.infer<typeof ProbeAnchorInput>;

export const ProbeStage = z.object({
  stage: AnchorStage,
  ok: z.boolean(),
  status: z.number().int().nullable(),
  ms: z.number().nonnegative(),
  error: z.string().nullable(),
});
export type ProbeStage = z.infer<typeof ProbeStage>;

export const TomlCurrency = z.object({
  code: z.string(),
  issuer: z.string().nullable(),
});

export const TomlEndpoints = z.object({
  transferServer: z.url().nullable(),
  transferServerSep24: z.url().nullable(),
  directPaymentServer: z.url().nullable(),
  anchorQuoteServer: z.url().nullable(),
  webAuthEndpoint: z.url().nullable(),
  kycServer: z.url().nullable(),
});
export type TomlEndpoints = z.infer<typeof TomlEndpoints>;

export const TomlSummary = z.object({
  signingKey: z.string().nullable(),
  accounts: z.array(z.string()),
  currencies: z.array(TomlCurrency),
  endpoints: TomlEndpoints,
  networkPassphrase: z.string().nullable(),
  version: z.string().nullable(),
});
export type TomlSummary = z.infer<typeof TomlSummary>;

export const SepTestResult = z.object({
  passed: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
  names: z.array(z.string()),
});

export const AnchorTestsSummary = z.object({
  perSep: z.record(z.string(), SepTestResult),
});

export const ProbeAnchorOutput = z.object({
  domain: HomeDomain,
  stages: z.array(ProbeStage),
  findings: z.array(Finding),
  toml: TomlSummary.nullable(),
  anchorTests: AnchorTestsSummary.optional(),
});
export type ProbeAnchorOutput = z.infer<typeof ProbeAnchorOutput>;
