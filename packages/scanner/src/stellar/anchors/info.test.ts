import { describe, expect, it } from 'vitest';
import { appError } from '../../schema';
import { infoAssets, probeInfo } from './info';
import { fakeFetcher, jsonRoute, readJsonFixture, tomlFixture as toml } from './testing';

describe('infoAssets', () => {
  it('reads enabled, fee_fixed and min_amount per asset', () => {
    const info = readJsonFixture<{ deposit: unknown; withdraw: unknown }>(
      'info/kbtrading-sep6.json',
    );
    expect(infoAssets(info.deposit)).toEqual([
      { code: 'CLPX', enabled: true, feeFixed: 0, minAmount: 14000 },
      { code: 'BTCLN', enabled: true, feeFixed: 0, minAmount: 1000 },
    ]);
    expect(infoAssets(info.withdraw)[0]).toEqual({
      code: 'CLPX',
      enabled: false,
      feeFixed: null,
      minAmount: null,
    });
  });

  it('ignores non-object sections', () => {
    expect(infoAssets(null)).toEqual([]);
    expect(infoAssets({ USDC: true })).toEqual([]);
  });
});

describe('probeInfo', () => {
  it('reads both transfer servers', async () => {
    const fetch = fakeFetcher({
      'https://kbtrading.org/sep6/info': jsonRoute(readJsonFixture('info/kbtrading-sep6.json')),
      'https://kbtrading.org/sep24/info': jsonRoute(readJsonFixture('info/anclap-sep24.json')),
    });
    const outcome = await probeInfo(toml('clpx.finance'), fetch);
    expect(outcome.record).toMatchObject({ stage: 'info', ok: true, status: 200, error: null });
    expect(outcome.servers.map((s) => [s.sep, s.ok, s.deposit.length])).toEqual([
      ['sep6', true, 2],
      ['sep24', true, 2],
    ]);
  });

  it('reads a sep-24 only anchor', async () => {
    const fetch = fakeFetcher({
      'https://stellar.moneygram.com/stellaradapterservice/sep24/info': jsonRoute(
        readJsonFixture('info/moneygram-sep24.json'),
      ),
    });
    const outcome = await probeInfo(toml('stellar.moneygram.com'), fetch);
    expect(outcome.servers).toHaveLength(1);
    expect(outcome.servers[0]?.withdraw).toEqual([
      { code: 'USDC', enabled: true, feeFixed: 0, minAmount: 1 },
    ]);
  });

  it('fails when a server is unreachable', async () => {
    const fetch = fakeFetcher({
      'https://stellar.mykobo.co/sep6/info': appError(
        'UPSTREAM_FAILED',
        'getaddrinfo ENOTFOUND stellar.mykobo.co',
      ),
      'https://stellar.mykobo.co/sep24/info': { status: 502, body: 'Bad Gateway' },
    });
    const outcome = await probeInfo(toml('mykobo.co'), fetch);
    expect(outcome.record.ok).toBe(false);
    expect(outcome.record.error).toBe(
      'sep6: UPSTREAM_FAILED: getaddrinfo ENOTFOUND stellar.mykobo.co; sep24: http_502',
    );
  });

  it('fails on json without deposit or withdraw', async () => {
    const fetch = fakeFetcher({
      'https://kbtrading.org/sep6/info': jsonRoute({ fee: { enabled: true } }),
      'https://kbtrading.org/sep24/info': { status: 200, body: '<html></html>' },
    });
    const outcome = await probeInfo(toml('clpx.finance'), fetch);
    expect(outcome.servers.map((s) => s.error)).toEqual([
      'missing_deposit_and_withdraw',
      'invalid_json',
    ]);
  });

  it('skips when there is no transfer server', async () => {
    const outcome = await probeInfo(
      { ...toml('clpx.finance'), transferServer: null, transferServerSep24: null },
      fakeFetcher({}),
    );
    expect(outcome.record.error).toBe('skipped: not_applicable');
  });
});
