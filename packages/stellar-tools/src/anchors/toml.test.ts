import { appError } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { fakeFetcher, readFixture, readJsonFixture } from './testing';
import { fetchToml, issuers, parseToml, passphraseKind } from './toml';

const headers = readJsonFixture<Record<string, Record<string, string>>>('toml/headers.json');
const tomlRoute = (domain: string) => ({
  body: readFixture(`toml/${domain}.toml`),
  headers: headers[domain] ?? {},
});
const url = (domain: string) => `https://${domain}/.well-known/stellar.toml`;

describe('parseToml', () => {
  it('extracts the anchor fields from a real toml', () => {
    const parsed = parseToml(readFixture('toml/clpx.finance.toml'));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value).toEqual({
      signingKey: 'GAQJIBVWXUHLD5CSUZDWIQEML7MAGXSS64T6A26SI5CGA33U7ZSYIM54',
      accounts: ['GDYSPBVZHPQTYMGSYNOHRZQNLB3ZWFVQ2F7EP7YBOLRGD42XIC3QUX5G'],
      currencies: [
        { code: 'CLPX', issuer: 'GDYSPBVZHPQTYMGSYNOHRZQNLB3ZWFVQ2F7EP7YBOLRGD42XIC3QUX5G' },
      ],
      transferServer: 'https://kbtrading.org/sep6',
      transferServerSep24: 'https://kbtrading.org/sep24',
      directPaymentServer: 'https://kbtrading.org/sep31',
      anchorQuoteServer: null,
      webAuthEndpoint: 'https://kbtrading.org/auth',
      kycServer: 'https://kbtrading.org/kyc',
      networkPassphrase: 'Public Global Stellar Network ; September 2015',
      version: null,
    });
  });

  it('ignores commented-out endpoints', () => {
    const parsed = parseToml(readFixture('toml/anclap.com.toml'));
    expect(parsed.ok && parsed.value.directPaymentServer).toBeNull();
  });

  it('reads currencies without an issuer and dedupes issuers', () => {
    const parsed = parseToml(readFixture('toml/testanchor.stellar.org.toml'));
    if (!parsed.ok) throw new Error('expected toml to parse');
    expect(parsed.value.currencies.find((c) => c.code === 'native')?.issuer).toBeNull();
    expect(issuers(parsed.value)).toHaveLength(2);
  });

  it('rejects invalid toml', () => {
    const parsed = parseToml(readFixture('toml/invalid.toml'));
    expect(parsed.ok).toBe(false);
    if (parsed.ok) return;
    expect(parsed.error.message).toMatch(/^invalid_toml: /);
  });

  it('rejects html served instead of toml', () => {
    expect(parseToml(readFixture('toml/elroy.app.body.txt')).ok).toBe(false);
  });
});

describe('passphraseKind', () => {
  it('classifies passphrases', () => {
    expect(passphraseKind('Public Global Stellar Network ; September 2015')).toBe('mainnet');
    expect(passphraseKind('Test SDF Network ; September 2015')).toBe('testnet');
    expect(passphraseKind('Public Global Stellar Network; September 2015')).toBe('nonstandard');
    expect(passphraseKind(null)).toBe('absent');
  });
});

describe('fetchToml', () => {
  it('fetches and parses a reachable toml with redirects and timeout limits', async () => {
    const fetch = fakeFetcher({ [url('clpx.finance')]: tomlRoute('clpx.finance') });
    const outcome = await fetchToml('clpx.finance', fetch);
    expect(outcome.record).toMatchObject({ stage: 'toml', ok: true, status: 200, error: null });
    expect(outcome.passphrase).toBe('mainnet');
    expect(fetch.calls[0]?.init).toMatchObject({ timeoutMs: 15_000, maxRedirects: 3 });
  });

  it('marks testnet tomls', async () => {
    const domain = 'testanchor.stellar.org';
    const outcome = await fetchToml(domain, fakeFetcher({ [url(domain)]: tomlRoute(domain) }));
    expect(outcome.passphrase).toBe('testnet');
  });

  it('fails on 404', async () => {
    const outcome = await fetchToml(
      'gone.example',
      fakeFetcher({ [url('gone.example')]: { status: 404, body: 'not found' } }),
    );
    expect(outcome.record).toMatchObject({ ok: false, status: 404, error: 'http_404' });
    expect(outcome.toml).toBeNull();
  });

  it('fails when the page is html', async () => {
    const outcome = await fetchToml(
      'elroy.app',
      fakeFetcher({
        [url('elroy.app')]: { status: 200, body: readFixture('toml/elroy.app.body.txt') },
      }),
    );
    expect(outcome.record.ok).toBe(false);
    expect(outcome.record.error).toMatch(/^invalid_toml/);
  });

  it('fails on network errors', async () => {
    const outcome = await fetchToml(
      'mykobo.co',
      fakeFetcher({ [url('mykobo.co')]: appError('UPSTREAM_TIMEOUT', 'timed out after 15000ms') }),
    );
    expect(outcome.record).toMatchObject({ ok: false, status: null });
    expect(outcome.fetchError?.code).toBe('UPSTREAM_TIMEOUT');
  });
});
