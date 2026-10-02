import { defineTool, fail } from '../tool';
import { parseAsset } from './assets';
import { BuildPaymentPreflightInput, BuildPaymentPreflightOutput } from './failures-schemas';
import type { HorizonToolContext } from './network-context';
import { evaluatePreflight } from './preflight/checks';
import { alternativePlan } from './preflight/plans';

export const buildPaymentPreflight = defineTool({
  name: 'buildPaymentPreflight',
  description:
    'Pre-flight a mainnet payment without submitting anything: checks destination existence, trustline and authorization, limit headroom, source balance net of selling liabilities and the base reserve. Returns blockers with fixes and, when blocked, an alternative plan (sponsored trustline, claimable balance or create account) that requires approval.',
  input: BuildPaymentPreflightInput,
  output: BuildPaymentPreflightOutput,
  run: async ({ from, to, asset, amount }, ctx: HorizonToolContext) => {
    const [source, destination] = await Promise.all([
      ctx.horizon.account(from),
      ctx.horizon.account(to),
    ]);
    if (!source.ok) return fail(source.error.code, source.error.message, source.error.meta);
    if (!destination.ok) {
      return fail(destination.error.code, destination.error.message, destination.error.meta);
    }
    const parsedAsset = parseAsset(asset);
    const { checks, blockers } = evaluatePreflight({
      from,
      to,
      asset: parsedAsset,
      amount,
      source: source.value,
      destination: destination.value,
    });
    const alternative = alternativePlan({
      from,
      to,
      asset: parsedAsset,
      amount,
      blockers: blockers.map((blocker) => blocker.code),
    });
    return {
      ok: blockers.length === 0,
      blockers: blockers.map(({ code, fix }) => ({ code, fix })),
      checks,
      ...(alternative ? { alternative } : {}),
    };
  },
});
