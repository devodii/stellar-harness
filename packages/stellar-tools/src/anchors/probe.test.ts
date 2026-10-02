import { appError } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { ToolError } from '../tool';
import type { HorizonAccount } from './ports';
import { anchorTestSeps, probeAnchor } from './probe';
import type { AnchorTestsSummary, ProbeAnchorOutput } from './schemas';
import {
  type FakeRoute,
  fakeFetcher,
  fakeHorizon,
  jsonRoute,
  readFixture,
  readJsonFixture,
  tomlFixture,
} from './testing';

const tomlHeaders = readJsonFixture<Record<string, Record<string, string>>>('toml/headers.json');
const infoHeaders = readJsonFixture<Record<string, Record<string, string>>>('info/headers.json');
const account = readJsonFixture<HorizonAccount>('horizon/account-anclap-ars.json');
const challenge = (name: string) =>
  readJsonFixture<{ body: Record<string, unknown> }>(`sep10/${name}.json`).body;

const CLPX_ISSUER = 'GDYSPBVZHPQTYMGSYNOHRZQNLB3ZWFVQ2F7EP7YBOLRGD42XIC3QUX5G';
const ACAO = { 'access-control-allow-origin': '*' };

const tomlRoute = (domain: string, body = readFixture(`toml/${domain}.toml`)): FakeRoute => ({
  body,
  headers: tomlHeaders[domain] ?? {},
});

const clpxRoutes = (toml = readFixture('toml/clpx.finance.toml')): Record<string, FakeRoute> => ({
  'https://clpx.finance/.well-known/stellar.toml': tomlRoute('clpx.finance', toml),
  'https://kbtrading.org/sep6/info': jsonRoute(
    readJsonFixture('info/kbtrading-sep6.json'),
    infoHeaders['kbtrading-sep6'],
  ),
  'https://kbtrading.org/sep24/info': jsonRoute(readJsonFixture('info/anclap-sep24.json'), ACAO),
  'https://kbtrading.org/sep31/info': jsonRoute(readJsonFixture('info/kbtrading-sep31.json'), ACAO),
  'https://kbtrading.org/auth': jsonRoute(challenge('clpx'), ACAO),
});

const clpxHorizon = () =>
  fakeHorizon({ [CLPX_ISSUER]: { ...account, id: CLPX_ISSUER, home_domain: 'clpx.finance' } });

const types = (output: ProbeAnchorOutput) => output.findings.map((f) => f.type);
const stage = (output: ProbeAnchorOutput, name: string) =>
  output.stages.find((s) => s.stage === name);

describe('probeAnchor', () => {
  it('runs every stage for a reachable anchor', async () => {
    const output = await probeAnchor('https://CLPX.finance/', {
      fetch: fakeFetcher(clpxRoutes()),
      horizon: clpxHorizon(),
    });
    expect(output.domain).toBe('clpx.finance');
    expect(output.stages.map((s) => [s.stage, s.ok, s.error])).toEqual([
      ['toml', true, null],
      ['accounts', true, null],
      ['endpoints', true, null],
      ['info', true, null],
      ['sep10', false, 'challenge_checks_failed: homeDomainMatches'],
      ['sep38', false, 'skipped: not_applicable'],
      ['sep31', true, null],
      ['cors', true, null],
      ['tests', false, 'skipped: not_requested'],
    ]);
    expect(types(output)).toEqual(['ANCHOR_ISSUER_FLAGS', 'ANCHOR_SEP10_CHALLENGE_FAILS']);
    expect(output.details.info.map((s) => s.sep)).toEqual(['sep6', 'sep24']);
  });

  it('stops after an unreachable toml', async () => {
    const fetch = fakeFetcher({
      'https://gone.example/.well-known/stellar.toml': { status: 404, body: 'Not Found' },
    });
    const horizon = fakeHorizon({});
    const output = await probeAnchor(
      'gone.example',
      { fetch, horizon },
      { tags: ['region:latam'] },
    );
    expect(stage(output, 'toml')).toMatchObject({ ok: false, status: 404, error: 'http_404' });
    expect(output.stages).toHaveLength(9);
    expect(output.stages.slice(1).every((s) => s.error === 'skipped: toml_unreachable')).toBe(true);
    expect(output.findings).toEqual([
      {
        type: 'ANCHOR_TOML_UNREACHABLE',
        subjectKind: 'anchor_domain',
        subject: 'gone.example',
        severity: 'critical',
        evidence: {
          domain: 'gone.example',
          url: 'https://gone.example/.well-known/stellar.toml',
          status: 404,
          error: 'http_404',
        },
        tags: ['anchor', 'region:latam'],
      },
    ]);
    expect(fetch.calls).toHaveLength(1);
    expect(horizon.calls).toEqual([]);
  });

  it('treats invalid toml as unreachable', async () => {
    const fetch = fakeFetcher({
      'https://bad.example/.well-known/stellar.toml': { body: readFixture('toml/invalid.toml') },
    });
    const output = await probeAnchor('bad.example', { fetch, horizon: fakeHorizon({}) });
    expect(types(output)).toEqual(['ANCHOR_TOML_UNREACHABLE']);
    expect(output.findings[0]?.evidence.error).toMatch(/^invalid_toml/);
  });

  it('tags testnet tomls and skips network probes', async () => {
    const domain = 'testanchor.stellar.org';
    const fetch = fakeFetcher({
      [`https://${domain}/.well-known/stellar.toml`]: tomlRoute(domain),
    });
    const horizon = fakeHorizon({});
    const output = await probeAnchor(domain, { fetch, horizon });
    expect(output.tags).toEqual(['testnet_toml']);
    expect(output.stages.slice(1).every((s) => s.error === 'skipped: testnet_toml')).toBe(true);
    expect(fetch.calls).toHaveLength(1);
    expect(horizon.calls).toEqual([]);
  });

  it('reports a missing SIGNING_KEY', async () => {
    const toml = readFixture('toml/clpx.finance.toml').replace(/^SIGNING_KEY=.*$/m, '');
    const output = await probeAnchor('clpx.finance', {
      fetch: fakeFetcher(clpxRoutes(toml)),
      horizon: clpxHorizon(),
    });
    expect(types(output)).toContain('ANCHOR_TOML_MISSING_SIGNING_KEY');
    expect(
      output.findings.find((f) => f.type === 'ANCHOR_SEP10_CHALLENGE_FAILS')?.evidence,
    ).toMatchObject({ checks: { sourceIsSigningKey: false } });
  });

  it('stops when a toml has no sep endpoints', async () => {
    const fetch = fakeFetcher({
      'https://moneygram.com/.well-known/stellar.toml': tomlRoute('moneygram.com'),
    });
    const output = await probeAnchor('moneygram.com', { fetch, horizon: fakeHorizon({}) });
    expect(output.tags).toEqual(['nonstandard_passphrase']);
    expect(types(output)).toEqual([
      'ANCHOR_TOML_MISSING_SIGNING_KEY',
      'ANCHOR_TOML_NO_ACCOUNTS',
      'ANCHOR_NO_SEP_ENDPOINTS',
    ]);
    expect(stage(output, 'accounts')?.error).toBe('skipped: no_accounts');
    expect(stage(output, 'info')?.error).toBe('skipped: no_sep_endpoints');
    expect(output.findings.every((f) => f.tags.includes('nonstandard_passphrase'))).toBe(true);
  });

  it('flags missing cors, home domain mismatch and a foreign challenge domain', async () => {
    const fetch = fakeFetcher({
      'https://anclap.com/.well-known/stellar.toml': tomlRoute('anclap.com'),
      'https://api.anclap.com/transfer6/info': jsonRoute(
        readJsonFixture('info/kbtrading-sep6.json'),
        ACAO,
      ),
      'https://api.anclap.com/transfer24/info': jsonRoute(
        readJsonFixture('info/anclap-sep24.json'),
        infoHeaders['anclap-sep24'],
      ),
      'https://api.anclap.com/auth': jsonRoute(challenge('anclap'), ACAO),
    });
    const horizon = fakeHorizon({
      GCYE7C77EB5AWAA25R5XMWNI2EDOKTTFTTPZKM2SR5DI4B4WFD52DARS: account,
    });
    const output = await probeAnchor('anclap.com', { fetch, horizon });
    expect(types(output)).toEqual([
      'ANCHOR_HOME_DOMAIN_MISMATCH',
      'ANCHOR_ISSUER_FLAGS',
      'ANCHOR_SEP10_CHALLENGE_FAILS',
      'ANCHOR_TLS_OR_CORS_BROKEN',
    ]);
    const mismatch = output.findings[0];
    expect(mismatch).toMatchObject({
      subjectKind: 'account',
      subject: 'GCYE7C77EB5AWAA25R5XMWNI2EDOKTTFTTPZKM2SR5DI4B4WFD52DARS',
      severity: 'medium',
      evidence: { homeDomain: 'api.anclap.com' },
    });
    expect(mismatch?.tags).toContain('anchor_domain:anclap.com');
    expect(output.findings.at(-1)?.evidence).toMatchObject({
      checks: [{ target: 'toml', cors: false }],
    });
  });

  it('reports unreadable info as critical', async () => {
    const routes = clpxRoutes();
    routes['https://kbtrading.org/sep24/info'] = appError('UPSTREAM_FAILED', 'ECONNREFUSED');
    const output = await probeAnchor('clpx.finance', {
      fetch: fakeFetcher(routes),
      horizon: clpxHorizon(),
    });
    const finding = output.findings.find((f) => f.type === 'ANCHOR_INFO_UNREADABLE');
    expect(finding?.severity).toBe('critical');
    expect(finding?.evidence.servers).toEqual([
      {
        sep: 'sep24',
        url: 'https://kbtrading.org/sep24/info',
        status: null,
        error: 'UPSTREAM_FAILED: ECONNREFUSED',
      },
    ]);
  });

  it('reports a failing sep-31 info endpoint', async () => {
    const routes = clpxRoutes();
    routes['https://kbtrading.org/sep31/info'] = { status: 503, headers: ACAO };
    const output = await probeAnchor('clpx.finance', {
      fetch: fakeFetcher(routes),
      horizon: clpxHorizon(),
    });
    expect(output.findings.find((f) => f.type === 'ANCHOR_SEP31_INFO_FAILS')).toMatchObject({
      severity: 'medium',
      evidence: { status: 503, error: 'http_503' },
    });
  });

  describe('anchor tests stage', () => {
    const summary = (failed: number): AnchorTestsSummary => ({
      domain: 'clpx.finance',
      requestedSeps: [1, 10],
      ranSeps: [1, 10],
      perSep: {
        '1': { passed: 5, failed: 0, skipped: 0, names: [] },
        '10': { passed: 9, failed, skipped: 0, names: failed ? ['GET /auth: x'] : [] },
      },
      excludedSeps: [],
      excludedTests: [],
      error: null,
    });

    it('passes the seps advertised in the toml', () => {
      expect(anchorTestSeps(tomlFixture('clpx.finance'))).toEqual([1, 10, 12, 24, 31]);
      expect(anchorTestSeps(tomlFixture('testanchor.stellar.org'))).toEqual([
        1, 10, 12, 24, 31, 38,
      ]);
    });

    it('emits ANCHOR_TESTS_FAILED for failing tests', async () => {
      const calls: unknown[] = [];
      const output = await probeAnchor(
        'clpx.finance',
        {
          fetch: fakeFetcher(clpxRoutes()),
          horizon: clpxHorizon(),
          runAnchorTests: async (domain, seps) => {
            calls.push([domain, seps]);
            return summary(1);
          },
        },
        { runAnchorTests: true },
      );
      expect(calls).toEqual([['clpx.finance', [1, 10, 12, 24, 31]]]);
      expect(stage(output, 'tests')).toMatchObject({ ok: false, error: 'failed: 10 (1)' });
      expect(output.findings.find((f) => f.type === 'ANCHOR_TESTS_FAILED')?.severity).toBe('high');
      expect(output.anchorTests?.perSep['10']?.failed).toBe(1);
    });

    it('passes when every test passes', async () => {
      const output = await probeAnchor(
        'clpx.finance',
        {
          fetch: fakeFetcher(clpxRoutes()),
          horizon: clpxHorizon(),
          runAnchorTests: async () => summary(0),
        },
        { runAnchorTests: true },
      );
      expect(stage(output, 'tests')).toMatchObject({ ok: true, error: null });
    });

    it('records a crashed run without a finding', async () => {
      const output = await probeAnchor(
        'clpx.finance',
        {
          fetch: fakeFetcher(clpxRoutes()),
          horizon: clpxHorizon(),
          runAnchorTests: async () => {
            throw new Error('ConfigError: bad passphrase');
          },
        },
        { runAnchorTests: true },
      );
      expect(stage(output, 'tests')).toMatchObject({
        ok: false,
        error: 'ConfigError: bad passphrase',
      });
      expect(types(output)).not.toContain('ANCHOR_TESTS_FAILED');
    });

    it('skips when the runner is not wired', async () => {
      const output = await probeAnchor(
        'clpx.finance',
        { fetch: fakeFetcher(clpxRoutes()), horizon: clpxHorizon() },
        { runAnchorTests: true },
      );
      expect(stage(output, 'tests')?.error).toBe('skipped: anchor_tests_unavailable');
    });
  });

  it('rejects hosts that are not public hostnames', async () => {
    await expect(
      probeAnchor('127.0.0.1', { fetch: fakeFetcher({}), horizon: fakeHorizon({}) }),
    ).rejects.toBeInstanceOf(ToolError);
  });
});
