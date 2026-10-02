import { describe, expect, it } from 'vitest';
import { countryCode } from './country';

describe('countryCode', () => {
  it.each([
    ['Mexico', 'MX'],
    ['United States', 'US'],
    ['United Kingdom', 'GB'],
    ['Tanzania', 'TZ'],
    ['Philippines', 'PH'],
    ['Ukraine', 'UA'],
    ['Chile', 'CL'],
    ['br', 'BR'],
    ['USA', 'US'],
  ])('maps %s to %s', (name, code) => {
    expect(countryCode(name)).toBe(code);
  });

  it('returns null for unknown or empty values', () => {
    expect(countryCode('Atlantis')).toBeNull();
    expect(countryCode(null)).toBeNull();
    expect(countryCode('  ')).toBeNull();
  });
});
