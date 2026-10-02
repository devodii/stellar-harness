import { describe, expect, it } from 'vitest';
import { appError, err, ok } from '../../schema';
import fixtures from './__fixtures__/horizon.json';
import { createHorizonClient } from './horizon';
import type { RpcHealth } from './rpc';
import {
  daysForLedgers,
  ledgersForDays,
  measureCloseSeconds,
  readGitSha,
  rpcLedgers,
  takeSnapshot,
} from './snapshot';
import { jsonResponse, mockHttp } from './test-utils';

const horizonFrom = (route: (url: URL) => Response) => {
  const mock = mockHttp((url) => route(new URL(url)));
  return {
    ...mock,
    horizon: createHorizonClient({ http: mock.http, url: 'https://horizon.stellar.org' }),
  };
};

describe('takeSnapshot', () => {
  it('measures close time across ledgers 2,000 apart from real horizon data', async () => {
    const { horizon, calls } = horizonFrom((url) =>
      jsonResponse(url.pathname === '/ledgers' ? fixtures.latestLedger : fixtures.ledger),
    );
    const result = await takeSnapshot({ horizon }, { gitSha: 'abc123' });
    expect(result).toEqual({
      ok: true,
      value: {
        snapshotLedger: 64722901,
        snapshotTime: '2026-10-02T00:18:07.000Z',
        ledgerCloseSeconds: 5,
        gitSha: 'abc123',
        network: 'mainnet',
      },
    });
    expect(calls[1]?.url).toBe('https://horizon.stellar.org/ledgers/64720901');
  });

  it('returns the upstream error when horizon fails', async () => {
    const { horizon } = horizonFrom(() => jsonResponse({ status: 404 }, 404));
    const result = await takeSnapshot({ horizon }, { gitSha: 'x' });
    expect(result.ok).toBe(false);
  });
});

describe('takeSnapshot with a network and an rpc fallback', () => {
  const testnetHealth = {
    status: 'healthy',
    latestLedger: 4_979_339,
    latestLedgerCloseTime: 1_790_920_282,
    oldestLedger: 4_858_380,
    oldestLedgerCloseTime: 1_790_315_487,
    ledgerRetentionWindow: 120_960,
  };
  const rpc = (health: RpcHealth | null) => ({
    getHealth: async () => (health ? ok(health) : err(appError('UPSTREAM_FAILED', 'rpc down'))),
  });
  const horizonDown = () =>
    horizonFrom(() => {
      throw new TypeError('fetch failed');
    }).horizon;

  it('records the selected network', async () => {
    const { horizon } = horizonFrom((url) =>
      jsonResponse(url.pathname === '/ledgers' ? fixtures.latestLedger : fixtures.ledger),
    );
    const result = await takeSnapshot({ horizon }, { gitSha: 'x', network: 'testnet' });
    expect(result.ok && result.value.network).toBe('testnet');
  });

  it('measures the close time over the rpc retention window when horizon is down', async () => {
    const result = await takeSnapshot(
      { horizon: horizonDown(), rpc: rpc(testnetHealth) },
      { gitSha: 'x', network: 'testnet' },
    );
    expect(result).toEqual({
      ok: true,
      value: {
        snapshotLedger: 4_979_339,
        snapshotTime: '2026-10-02T05:51:22.000Z',
        ledgerCloseSeconds: 5,
        gitSha: 'x',
        network: 'testnet',
      },
    });
  });

  it('returns the rpc error when both sources fail', async () => {
    const result = await takeSnapshot({ horizon: horizonDown(), rpc: rpc(null) }, { gitSha: 'x' });
    expect(result.ok).toBe(false);
  });

  it('goes straight to rpc when told to skip horizon', async () => {
    const { horizon, calls } = horizonFrom(() => jsonResponse(fixtures.latestLedger));
    const result = await takeSnapshot(
      { horizon, rpc: rpc(testnetHealth) },
      { gitSha: 'x', network: 'testnet', skipHorizon: true },
    );
    expect(result.ok && result.value.snapshotLedger).toBe(4_979_339);
    expect(calls).toEqual([]);
  });

  it('rejects rpc health without close times', async () => {
    const { latestLedgerCloseTime: _, ...partial } = testnetHealth;
    const result = await rpcLedgers(rpc(partial));
    expect(result.ok ? null : result.error.message).toMatch(/no ledger close times/);
  });
});

describe('ledger and day conversions', () => {
  it('round trips days and ledgers at a measured close time', () => {
    expect(ledgersForDays(7, 5)).toBe(120_960);
    expect(ledgersForDays(365, 5.8)).toBe(5_437_241);
    expect(daysForLedgers(17_280, 5)).toBe(1);
  });

  it('measures fractional close seconds', () => {
    expect(
      measureCloseSeconds(
        { sequence: 3000, closed_at: '2026-01-01T03:13:20Z' },
        { sequence: 1000, closed_at: '2026-01-01T00:00:00Z' },
      ),
    ).toBe(5.8);
  });
});

describe('readGitSha', () => {
  it('falls back to unknown outside a repository', () => {
    expect(readGitSha('/')).toBe('unknown');
  });
});
