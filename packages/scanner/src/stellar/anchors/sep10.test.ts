import { StrKey } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import { NETWORK_PROFILES } from '../../schema';
import { probeSep10, randomClientAccount, verifyChallenge } from './sep10';
import { fakeFetcher, jsonRoute, readJsonFixture, tomlFixture } from './testing';

type ChallengeFixture = { status: number; body: Record<string, unknown> };
const anclap = readJsonFixture<ChallengeFixture>('sep10/anclap.json');
const clpx = readJsonFixture<ChallengeFixture>('sep10/clpx.json');
const moneygram = readJsonFixture<ChallengeFixture>('sep10/moneygram-client-domain.json');
const ANCLAP_KEY = 'GDVHOU4AF2QINLYETV2YFC7YWPRVXN4SKR6SOJZ7LAWODJIZJ7ZPJUER';
const CLPX_KEY = 'GAQJIBVWXUHLD5CSUZDWIQEML7MAGXSS64T6A26SI5CGA33U7ZSYIM54';
const tx = (fixture: ChallengeFixture) => String(fixture.body.transaction);
const MAINNET = NETWORK_PROFILES.mainnet.passphrase;
const TESTNET = NETWORK_PROFILES.testnet.passphrase;

describe('verifyChallenge', () => {
  it('accepts a real challenge for its own home domain', () => {
    expect(
      verifyChallenge(tx(anclap), {
        signingKey: ANCLAP_KEY,
        domain: 'api.anclap.com',
        networkPassphrase: MAINNET,
      }),
    ).toEqual({
      checks: {
        sourceIsSigningKey: true,
        firstOpManageData: true,
        homeDomainMatches: true,
        timeboundsPresent: true,
      },
      error: null,
    });
  });

  it('flags a manage_data key for another home domain', () => {
    const { checks } = verifyChallenge(tx(clpx), {
      signingKey: CLPX_KEY,
      domain: 'clpx.finance',
      networkPassphrase: MAINNET,
    });
    expect(checks).toMatchObject({ sourceIsSigningKey: true, homeDomainMatches: false });
  });

  it('flags a challenge not sourced from SIGNING_KEY', () => {
    const { checks } = verifyChallenge(tx(anclap), {
      signingKey: CLPX_KEY,
      domain: 'api.anclap.com',
      networkPassphrase: MAINNET,
    });
    expect(checks.sourceIsSigningKey).toBe(false);
  });

  it('fails on undecodable xdr', () => {
    const result = verifyChallenge('AAAA', {
      signingKey: CLPX_KEY,
      domain: 'clpx.finance',
      networkPassphrase: MAINNET,
    });
    expect(result.error).toMatch(/^undecodable_challenge/);
  });
});

describe('randomClientAccount', () => {
  it('returns only a public key', () => {
    const account = randomClientAccount();
    expect(StrKey.isValidEd25519PublicKey(account)).toBe(true);
    expect(randomClientAccount()).not.toBe(account);
  });
});

describe('probeSep10', () => {
  const endpoint = 'https://api.anclap.com/auth';
  const toml = { ...tomlFixture('anclap.com'), webAuthEndpoint: endpoint };

  it('requests a challenge for a random public key and verifies it', async () => {
    const fetch = fakeFetcher({ [endpoint]: jsonRoute(anclap.body) });
    const outcome = await probeSep10('api.anclap.com', toml, fetch, MAINNET);
    expect(outcome.record).toMatchObject({ stage: 'sep10', ok: true, status: 200, error: null });
    expect(outcome.probe?.checks?.expectedPassphrase).toBe(true);
    const account = new URL(fetch.calls[0]?.url ?? '').searchParams.get('account') ?? '';
    expect(StrKey.isValidEd25519PublicKey(account)).toBe(true);
  });

  it('fails when the challenge home domain differs from the probed domain', async () => {
    const fetch = fakeFetcher({ [endpoint]: jsonRoute(anclap.body) });
    const outcome = await probeSep10('anclap.com', toml, fetch, MAINNET);
    expect(outcome.record.ok).toBe(false);
    expect(outcome.record.error).toBe('challenge_checks_failed: homeDomainMatches');
  });

  it('fails when the toml has no SIGNING_KEY', async () => {
    const fetch = fakeFetcher({ [endpoint]: jsonRoute(anclap.body) });
    const outcome = await probeSep10(
      'api.anclap.com',
      { ...toml, signingKey: null },
      fetch,
      MAINNET,
    );
    expect(outcome.record.error).toBe('challenge_checks_failed: sourceIsSigningKey');
  });

  it('fails on a testnet network passphrase', async () => {
    const body = { ...anclap.body, network_passphrase: 'Test SDF Network ; September 2015' };
    const outcome = await probeSep10(
      'api.anclap.com',
      toml,
      fakeFetcher({ [endpoint]: jsonRoute(body) }),
      MAINNET,
    );
    expect(outcome.record.error).toBe('challenge_checks_failed: expectedPassphrase');
  });

  it('fails without a transaction', async () => {
    const outcome = await probeSep10(
      'api.anclap.com',
      toml,
      fakeFetcher({ [endpoint]: jsonRoute({ error: 'nope' }) }),
      MAINNET,
    );
    expect(outcome.record.error).toBe('missing_transaction');
  });

  it('treats a client_domain requirement as reachable but unverified', async () => {
    const mgEndpoint = 'https://stellar.moneygram.com/stellaradapterservice/auth';
    const fetch = fakeFetcher({
      [mgEndpoint]: { status: moneygram.status, body: JSON.stringify(moneygram.body) },
    });
    const outcome = await probeSep10(
      'stellar.moneygram.com',
      tomlFixture('stellar.moneygram.com'),
      fetch,
      MAINNET,
    );
    expect(outcome.record).toMatchObject({ ok: true, status: 400 });
    expect(outcome.probe?.clientDomainRequired).toBe(true);
  });

  it('fails on http errors', async () => {
    const outcome = await probeSep10(
      'api.anclap.com',
      toml,
      fakeFetcher({ [endpoint]: { status: 500, body: 'oops' } }),
      MAINNET,
    );
    expect(outcome.record).toMatchObject({ ok: false, status: 500, error: 'http_500' });
  });

  it('skips without WEB_AUTH_ENDPOINT', async () => {
    const outcome = await probeSep10(
      'x.example',
      { ...toml, webAuthEndpoint: null },
      fakeFetcher({}),
      MAINNET,
    );
    expect(outcome.record.error).toBe('skipped: not_applicable');
  });

  it('verifies a testnet challenge against the testnet passphrase', async () => {
    const body = { ...anclap.body, network_passphrase: TESTNET };
    const fetch = fakeFetcher({ [endpoint]: jsonRoute(body) });
    const outcome = await probeSep10('api.anclap.com', toml, fetch, TESTNET);
    expect(outcome.probe?.checks).toMatchObject({
      expectedPassphrase: true,
      homeDomainMatches: true,
    });
  });

  it('fails on a mainnet passphrase when testnet is expected', async () => {
    const fetch = fakeFetcher({ [endpoint]: jsonRoute(anclap.body) });
    const outcome = await probeSep10('api.anclap.com', toml, fetch, TESTNET);
    expect(outcome.record.error).toBe('challenge_checks_failed: expectedPassphrase');
  });
});
