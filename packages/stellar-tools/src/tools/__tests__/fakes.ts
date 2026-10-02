import { appError, err, ok } from '@harness/schema';
import type { Fetcher, HorizonAccount, HorizonPort, HttpRequest } from '../../ports';

export const fakeHorizon = (
  accounts: Record<string, HorizonAccount | null>,
  failing: ReadonlySet<string> = new Set(),
) => {
  const calls: string[] = [];
  const port: HorizonPort = {
    account: async (id) => {
      calls.push(id);
      if (failing.has(id)) return err(appError('UPSTREAM_TIMEOUT', 'horizon timeout'));
      return ok(accounts[id] ?? null);
    },
    firstOperation: async () => ok(null),
  };
  return { port, calls };
};

export type FakeRoute = { status: number; body: unknown };

export const fakeFetcher = (route: (url: string, init?: HttpRequest) => FakeRoute | undefined) => {
  const calls: { url: string; init?: HttpRequest }[] = [];
  const fetch: Fetcher = async (url, init) => {
    calls.push({ url, init });
    const response = route(url, init);
    if (!response) return err(appError('UPSTREAM_FAILED', `no route for ${url}`));
    return ok({
      url,
      status: response.status,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(response.body),
      ms: 1,
      cached: false,
    });
  };
  return { fetch, calls };
};
