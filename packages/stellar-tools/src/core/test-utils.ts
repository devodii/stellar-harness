import { createHttp, type Http, type HttpOptions } from './http';
import { silentLogger } from './log';

export type MockRoute = (url: string, init: RequestInit) => Response | Promise<Response> | null;

export type MockCall = { url: string; method: string; body: unknown };

export const jsonResponse = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  });

const parseBody = (body: RequestInit['body']): unknown => {
  if (typeof body !== 'string') return undefined;
  try {
    return JSON.parse(body);
  } catch {
    return body;
  }
};

export const mockHttp = (route: MockRoute, options: Partial<HttpOptions> = {}) => {
  const calls: MockCall[] = [];
  const fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = input.toString();
    calls.push({ url, method: init.method ?? 'GET', body: parseBody(init.body) });
    const response = await route(url, init);
    if (!response) throw new Error(`No mock route for ${init.method ?? 'GET'} ${url}`);
    return response;
  }) as typeof globalThis.fetch;
  const http: Http = createHttp({
    fetch,
    log: silentLogger,
    sleep: async () => {},
    ...options,
  });
  return { http, calls };
};

export const rpcMethodOf = (init: RequestInit): string | null => {
  const body = parseBody(init.body);
  return body && typeof body === 'object' && 'method' in body && typeof body.method === 'string'
    ? body.method
    : null;
};
