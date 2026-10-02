import type { Result } from '@harness/schema';
import { type NetworkSelection, resolveNetwork } from '../core/network';
import { fail } from '../tool';
import { defineNamedTool } from './define';

export type NetworkStatusSource = {
  latestLedger(): Promise<
    Result<{ sequence: number; protocolVersion: number; closeTime?: number | undefined }>
  >;
  health(): Promise<
    Result<{ status: string; oldestLedger: number; ledgerRetentionWindow: number }>
  >;
  horizonLedger(): Promise<Result<{ sequence: number }>>;
};

export type NetworkStatusContext = NetworkSelection & { networkStatus: NetworkStatusSource };

export const getNetworkStatus = defineNamedTool(
  'getNetworkStatus',
  async (_input, ctx: NetworkStatusContext) => {
    const [latest, health, horizon] = await Promise.all([
      ctx.networkStatus.latestLedger(),
      ctx.networkStatus.health(),
      ctx.networkStatus.horizonLedger(),
    ]);
    if (!latest.ok) return fail(latest.error.code, latest.error.message, latest.error.meta);
    const horizonLedger = horizon.ok ? horizon.value.sequence : null;
    return {
      network: resolveNetwork(ctx).network,
      latestLedger: latest.value.sequence,
      closedAt:
        latest.value.closeTime === undefined
          ? null
          : new Date(latest.value.closeTime * 1000).toISOString(),
      protocolVersion: latest.value.protocolVersion,
      rpc: health.ok
        ? {
            status: health.value.status,
            oldestLedger: health.value.oldestLedger,
            retentionLedgers: health.value.ledgerRetentionWindow,
          }
        : { status: 'unavailable', oldestLedger: 0, retentionLedgers: 0 },
      horizon: {
        ok: horizon.ok,
        latestLedger: horizonLedger,
        lagLedgers: horizonLedger === null ? null : latest.value.sequence - horizonLedger,
      },
    };
  },
);
