import { NETWORK_COOKIE, type Network, parseNetwork } from '@harness/schema';

export const NETWORK_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface CookieReader {
  get: (name: string) => { value: string } | undefined;
}

export const networkFromCookies = (cookies: CookieReader): Network =>
  parseNetwork(cookies.get(NETWORK_COOKIE)?.value);

export const networkCookie = (network: Network) => ({
  name: NETWORK_COOKIE,
  value: network,
  path: '/',
  httpOnly: false,
  sameSite: 'lax' as const,
  maxAge: NETWORK_COOKIE_MAX_AGE_SECONDS,
});
