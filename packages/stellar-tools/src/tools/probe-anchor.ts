import { z } from 'zod';
import { toFinding } from '../anchors/finding';
import { type AnchorProbePorts, probeAnchor } from '../anchors/probe';
import type { AnchorProbeResult, AnchorToml } from '../anchors/schemas';
import { defineNamedTool } from './define';
import type { ProbeAnchorOutput, TomlEndpoints, TomlSummary } from './schemas';

export type ProbeAnchorContext = AnchorProbePorts & {
  latestLedger: () => Promise<number>;
  now?: () => Date;
};

const urlOrNull = (value: string | null): string | null =>
  value !== null && z.url().safeParse(value).success ? value : null;

export const toTomlSummary = (toml: AnchorToml): TomlSummary => {
  const endpoints: TomlEndpoints = {
    transferServer: urlOrNull(toml.transferServer),
    transferServerSep24: urlOrNull(toml.transferServerSep24),
    directPaymentServer: urlOrNull(toml.directPaymentServer),
    anchorQuoteServer: urlOrNull(toml.anchorQuoteServer),
    webAuthEndpoint: urlOrNull(toml.webAuthEndpoint),
    kycServer: urlOrNull(toml.kycServer),
  };
  return {
    signingKey: toml.signingKey,
    accounts: toml.accounts,
    currencies: toml.currencies,
    endpoints,
    networkPassphrase: toml.networkPassphrase,
    version: toml.version,
  };
};

export const toProbeAnchorOutput = (
  result: AnchorProbeResult,
  meta: { snapshotLedger: number; observedAt: string },
): ProbeAnchorOutput => ({
  domain: result.domain,
  stages: result.stages,
  findings: result.findings.map((draft) => toFinding(draft, meta)),
  toml: result.toml ? toTomlSummary(result.toml) : null,
  ...(result.anchorTests
    ? {
        anchorTests: {
          perSep: Object.fromEntries(
            Object.entries(result.anchorTests.perSep).map(([sep, { passed, failed, names }]) => [
              sep,
              { passed, failed, names },
            ]),
          ),
        },
      }
    : {}),
});

export const probeAnchorTool = defineNamedTool(
  'probeAnchor',
  async ({ domain, runAnchorTests }, ctx: ProbeAnchorContext) => {
    const result = await probeAnchor(domain, ctx, { runAnchorTests });
    const snapshotLedger = await ctx.latestLedger();
    const observedAt = (ctx.now?.() ?? new Date()).toISOString();
    return toProbeAnchorOutput(result, { snapshotLedger, observedAt });
  },
);
