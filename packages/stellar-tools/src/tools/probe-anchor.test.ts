import { describe, expect, it } from 'vitest';
import type { HorizonAccount } from '../anchors/ports';
import {
  fakeFetcher,
  fakeHorizon,
  jsonRoute,
  readFixture,
  readJsonFixture,
  tomlFixture,
} from '../anchors/testing';
import { invokeTool } from '../tool';
import { type ProbeAnchorContext, probeAnchorTool, toTomlSummary } from './probe-anchor';

const ACAO = { 'access-control-allow-origin': '*' };
const ISSUER = 'GDYSPBVZHPQTYMGSYNOHRZQNLB3ZWFVQ2F7EP7YBOLRGD42XIC3QUX5G';
const account = readJsonFixture<HorizonAccount>('horizon/account-anclap-ars.json');

const ctx = (overrides: Partial<ProbeAnchorContext> = {}): ProbeAnchorContext => ({
  fetch: fakeFetcher({
    'https://clpx.finance/.well-known/stellar.toml': {
      body: readFixture('toml/clpx.finance.toml'),
      headers: ACAO,
    },
    'https://kbtrading.org/sep6/info': jsonRoute(readJsonFixture('info/kbtrading-sep6.json'), ACAO),
    'https://kbtrading.org/sep24/info': jsonRoute(readJsonFixture('info/anclap-sep24.json'), ACAO),
    'https://kbtrading.org/sep31/info': jsonRoute(
      readJsonFixture('info/kbtrading-sep31.json'),
      ACAO,
    ),
    'https://kbtrading.org/auth': jsonRoute(
      readJsonFixture<{ body: unknown }>('sep10/clpx.json').body,
      ACAO,
    ),
  }),
  horizon: fakeHorizon({ [ISSUER]: { ...account, id: ISSUER, home_domain: 'clpx.finance' } }),
  latestLedger: async () => 59_000_000,
  now: () => new Date('2026-10-02T00:00:00.000Z'),
  ...overrides,
});

describe('probeAnchor tool', () => {
  it('returns stages, full findings and the toml summary', async () => {
    const result = await invokeTool(probeAnchorTool, { domain: 'clpx.finance' }, ctx());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.domain).toBe('clpx.finance');
    expect(result.data.stages).toHaveLength(9);
    expect(result.data.toml?.endpoints.webAuthEndpoint).toBe('https://kbtrading.org/auth');
    expect(result.data.findings.map((f) => [f.type, f.snapshotLedger, f.observedAt])).toEqual([
      ['ANCHOR_ISSUER_FLAGS', 59_000_000, '2026-10-02T00:00:00.000Z'],
      ['ANCHOR_SEP10_CHALLENGE_FAILS', 59_000_000, '2026-10-02T00:00:00.000Z'],
    ]);
    expect(result.data.anchorTests).toBeUndefined();
  });

  it('includes anchor test results when requested', async () => {
    const result = await invokeTool(
      probeAnchorTool,
      { domain: 'clpx.finance', runAnchorTests: true },
      ctx({
        runAnchorTests: async (domain, seps) => ({
          domain,
          requestedSeps: seps,
          ranSeps: [1],
          perSep: { '1': { passed: 5, failed: 0, skipped: 0, names: [] } },
          excludedSeps: [{ sep: 31, reason: 'requires a configured secret key' }],
          excludedTests: [],
          error: null,
        }),
      }),
    );
    expect(result.ok && result.data.anchorTests).toEqual({
      perSep: { '1': { passed: 5, failed: 0, names: [] } },
    });
  });

  it('rejects inputs that are not bare domains', async () => {
    const result = await invokeTool(probeAnchorTool, { domain: 'http://10.0.0.1/' }, ctx());
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('drops endpoint values that are not urls', () => {
    const summary = toTomlSummary({
      ...tomlFixture('clpx.finance'),
      kycServer: 'kbtrading.org/kyc',
    });
    expect(summary.endpoints.kycServer).toBeNull();
  });
});
