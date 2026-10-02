import { describe, expect, it } from 'vitest';
import { appError } from '../../schema';
import { brokenCors, type CorsInput, checkCors } from './cors';
import type { HttpResponse } from './ports';
import { readJsonFixture } from './testing';

const tomlHeaders = readJsonFixture<Record<string, Record<string, string>>>('toml/headers.json');
const infoHeaders = readJsonFixture<Record<string, Record<string, string>>>('info/headers.json');

const response = (url: string, headers: Record<string, string> = {}): HttpResponse => ({
  url,
  status: 200,
  headers,
  body: '',
  ms: 1,
  cached: false,
});

const input = (target: CorsInput['target'], url: string, headers?: Record<string, string>) => ({
  target,
  url,
  response: response(url, headers),
  fetchError: null,
});

describe('checkCors', () => {
  it('passes when every response carries access-control-allow-origin', () => {
    const outcome = checkCors([
      input('toml', 'https://clpx.finance/.well-known/stellar.toml', tomlHeaders['clpx.finance']),
      input('sep6_info', 'https://kbtrading.org/sep6/info', infoHeaders['kbtrading-sep6']),
    ]);
    expect(outcome.record).toMatchObject({ stage: 'cors', ok: true, error: null });
    expect(outcome.checks.every((c) => c.cors && c.tls)).toBe(true);
  });

  it('flags a toml served without cors', () => {
    const outcome = checkCors([
      input('toml', 'https://anclap.com/.well-known/stellar.toml', tomlHeaders['anclap.com']),
      input('sep24_info', 'https://api.anclap.com/transfer24/info', infoHeaders['anclap-sep24']),
    ]);
    expect(outcome.record).toMatchObject({ ok: false, error: 'toml: missing_cors' });
    expect(brokenCors(outcome.checks).map((c) => c.target)).toEqual(['toml']);
  });

  it('flags tls failures from the port and from fetch errors', () => {
    const tlsBroken = {
      ...input('toml', 'https://x.example/.well-known/stellar.toml', {
        'access-control-allow-origin': '*',
      }),
    };
    tlsBroken.response = { ...tlsBroken.response, tls: { ok: false, error: 'CERT_HAS_EXPIRED' } };
    const outcome = checkCors([
      tlsBroken,
      {
        target: 'sep24_info',
        url: 'https://x.example/sep24/info',
        response: null,
        fetchError: appError('UPSTREAM_FAILED', 'unable to verify the first certificate'),
      },
    ]);
    expect(outcome.record.error).toBe(
      'toml: tls CERT_HAS_EXPIRED; sep24_info: missing_cors; sep24_info: tls unable to verify the first certificate',
    );
  });

  it('flags plain http endpoints', () => {
    const outcome = checkCors([
      input('sep6_info', 'http://x.example/info', { 'access-control-allow-origin': '*' }),
    ]);
    expect(outcome.checks[0]).toMatchObject({ tls: false, tlsError: 'not_https' });
  });

  it('ignores unreachable endpoints without tls errors', () => {
    const outcome = checkCors([
      {
        target: 'sep31_info',
        url: 'https://x.example/info',
        response: null,
        fetchError: appError('UPSTREAM_TIMEOUT', 'timed out'),
      },
    ]);
    expect(outcome.record.error).toBe('skipped: not_applicable');
  });
});
