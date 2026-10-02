import { fail } from '../tool';
import { parseAsset } from './assets';
import type { PolicyContext } from './context';
import { defineNamedTool } from './define';
import type { HorizonToolContext } from './network-context';
import { evaluatePreflight } from './preflight/checks';
import { alternativePlan } from './preflight/plans';

export type PaymentPreflightContext = HorizonToolContext & Partial<PolicyContext>;

export const buildPaymentPreflight = defineNamedTool(
  'buildPaymentPreflight',
  async ({ from, to, asset, amount }, ctx: PaymentPreflightContext) => {
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
      ...(ctx.policy ? { policy: ctx.policy } : {}),
    });
    return {
      ok: blockers.length === 0,
      blockers: blockers.map(({ code, fix }) => ({ code, fix })),
      checks,
      ...(alternative ? { alternative } : {}),
    };
  },
);
