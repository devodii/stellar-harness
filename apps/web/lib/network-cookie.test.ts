import { NETWORK_COOKIE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import {
  NETWORK_COOKIE_MAX_AGE_SECONDS,
  networkCookie,
  networkFromCookies,
} from './network-cookie';

const jar = (values: Record<string, string>) => ({
  get: (name: string) => (name in values ? { value: values[name] ?? '' } : undefined),
});

describe('networkFromCookies', () => {
  it('reads a known network from the cookie', () => {
    expect(networkFromCookies(jar({ [NETWORK_COOKIE]: 'testnet' }))).toBe('testnet');
    expect(networkFromCookies(jar({ [NETWORK_COOKIE]: 'mainnet' }))).toBe('mainnet');
  });

  it('falls back to mainnet when the cookie is missing or unknown', () => {
    expect(networkFromCookies(jar({}))).toBe('mainnet');
    expect(networkFromCookies(jar({ [NETWORK_COOKIE]: 'futurenet' }))).toBe('mainnet');
    expect(networkFromCookies(jar({ [NETWORK_COOKIE]: '' }))).toBe('mainnet');
  });
});

describe('networkCookie', () => {
  it('is readable by the client, lax and kept for a year', () => {
    expect(networkCookie('testnet')).toEqual({
      name: NETWORK_COOKIE,
      value: 'testnet',
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: NETWORK_COOKIE_MAX_AGE_SECONDS,
    });
    expect(NETWORK_COOKIE_MAX_AGE_SECONDS).toBe(31_536_000);
  });
});
