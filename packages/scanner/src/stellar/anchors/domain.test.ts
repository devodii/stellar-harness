import { describe, expect, it } from 'vitest';
import { hostOf, normalizeDomain, stripWww, tomlUrlFor } from './domain';

describe('normalizeDomain', () => {
  it.each([
    ['clpx.finance', 'clpx.finance'],
    ['  Stellar.MoneyGram.com. ', 'stellar.moneygram.com'],
    ['https://anclap.com/some/path?q=1', 'anclap.com'],
    ['http://mykobo.co', 'mykobo.co'],
  ])('normalizes %s', (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each([
    '',
    'localhost',
    '127.0.0.1',
    'https://10.0.0.1/',
    'anclap.com:8443',
    'https://user:pw@anclap.com',
    'not a domain',
  ])('rejects %s', (input) => {
    expect(normalizeDomain(input)).toBeNull();
  });
});

describe('url helpers', () => {
  it('extracts hosts from urls', () => {
    expect(hostOf('https://api.anclap.com/transfer24')).toBe('api.anclap.com');
    expect(hostOf('nonsense')).toBeNull();
  });

  it('strips a leading www', () => {
    expect(stripWww('www.bossmoney.com')).toBe('bossmoney.com');
  });

  it('builds the well-known toml url', () => {
    expect(tomlUrlFor('clpx.finance')).toBe('https://clpx.finance/.well-known/stellar.toml');
  });
});
