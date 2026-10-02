import { readFileSync } from 'node:fs';
import { type AppError, appError, err, ok } from '@harness/schema';
import type { Fetcher, HorizonAccount, HorizonPort, HttpRequest, HttpResponse } from './ports';

export const readFixture = (relative: string): string =>
  readFileSync(new URL(`./__fixtures__/${relative}`, import.meta.url), 'utf8');

export const readJsonFixture = <T = unknown>(relative: string): T =>
  JSON.parse(readFixture(relative)) as T;

export type FakeRoute = Partial<Omit<HttpResponse, 'url'>> | AppError;

export type FakeFetcher = Fetcher & { calls: { url: string; init?: HttpRequest }[] };

const isAppError = (route: FakeRoute): route is AppError => 'code' in route && 'message' in route;

const routeKey = (url: string): string => url.split('?')[0] ?? url;

export const fakeFetcher = (routes: Record<string, FakeRoute>): FakeFetcher => {
  const calls: FakeFetcher['calls'] = [];
  const fetcher = async (url: string, init?: HttpRequest) => {
    calls.push({ url, init });
    const route = routes[url] ?? routes[routeKey(url)];
    if (!route) return err(appError('UPSTREAM_FAILED', `ENOTFOUND ${new URL(url).hostname}`));
    if (isAppError(route)) return err(route);
    return ok({
      url,
      status: 200,
      headers: {},
      body: '',
      ms: 5,
      cached: false,
      ...route,
    });
  };
  return Object.assign(fetcher, { calls });
};

export const jsonRoute = (body: unknown, headers: Record<string, string> = {}): FakeRoute => ({
  status: 200,
  body: JSON.stringify(body),
  headers: { 'content-type': 'application/json', ...headers },
});

export const fakeHorizon = (
  accounts: Record<string, HorizonAccount | null | AppError>,
): HorizonPort & { calls: string[] } => {
  const calls: string[] = [];
  return {
    calls,
    account: async (id) => {
      calls.push(id);
      const entry = accounts[id];
      if (entry === undefined || entry === null) return ok(null);
      return 'code' in entry ? err(entry) : ok(entry);
    },
    firstOperation: async () => ok(null),
  };
};
