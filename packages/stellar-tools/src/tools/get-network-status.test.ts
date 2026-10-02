import { appError, err, ok } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { invokeTool } from '../tool';
import { getNetworkStatus, type NetworkStatusSource } from './get-network-status';

const source = (overrides: Partial<NetworkStatusSource> = {}): NetworkStatusSource => ({
  latestLedger: async () =>
    ok({ sequence: 64_736_900, protocolVersion: 29, closeTime: 1_790_967_901 }),
  health: async () =>
    ok({ status: 'healthy', oldestLedger: 64_615_941, ledgerRetentionWindow: 120_960 }),
  horizonLedger: async () => ok({ sequence: 64_736_899 }),
  ...overrides,
});

describe('getNetworkStatus', () => {
  it('reports the live ledger, rpc retention and horizon lag', async () => {
    const result = await invokeTool(getNetworkStatus, {}, { networkStatus: source() });
    expect(result).toMatchObject({
      ok: true,
      data: {
        network: 'mainnet',
        latestLedger: 64_736_900,
        closedAt: '2026-10-02T19:05:01.000Z',
        protocolVersion: 29,
        rpc: { status: 'healthy', retentionLedgers: 120_960 },
        horizon: { ok: true, latestLedger: 64_736_899, lagLedgers: 1 },
      },
    });
  });

  it('still answers when horizon is down', async () => {
    const result = await invokeTool(
      getNetworkStatus,
      {},
      {
        network: 'testnet',
        networkStatus: source({
          horizonLedger: async () => err(appError('UPSTREAM_FAILED', 'refused')),
        }),
      },
    );
    expect(result).toMatchObject({
      ok: true,
      data: { network: 'testnet', horizon: { ok: false, latestLedger: null, lagLedgers: null } },
    });
  });

  it('fails when rpc cannot give the latest ledger', async () => {
    const result = await invokeTool(
      getNetworkStatus,
      {},
      {
        networkStatus: source({
          latestLedger: async () => err(appError('UPSTREAM_TIMEOUT', 'slow')),
        }),
      },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } });
  });
});
