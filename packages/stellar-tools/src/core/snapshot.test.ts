import { describe, expect, it } from 'vitest';
import fixtures from './__fixtures__/horizon.json';
import { createHorizonClient } from './horizon';
import {
  daysForLedgers,
  ledgersForDays,
  measureCloseSeconds,
  readGitSha,
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
