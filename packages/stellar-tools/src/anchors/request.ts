import type { AppError } from '@harness/schema';
import type { Fetcher, HttpResponse } from './ports';
import type { EndpointProbe } from './schemas';
import { startTimer } from './stage';

export const PROBE_TIMEOUT_MS = 15_000;
export const PROBE_MAX_REDIRECTS = 3;
export const PROBE_ORIGIN = 'https://stellar-harness.invalid';

export type JsonProbe = EndpointProbe & {
  json: unknown;
  response: HttpResponse | null;
  fetchError: AppError | null;
};

export const joinUrl = (base: string, path: string): string =>
  `${base.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;

export const describeError = (error: AppError): string => `${error.code}: ${error.message}`;

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const fetchText = (fetch: Fetcher, url: string) =>
  fetch(url, {
    method: 'GET',
    headers: { Origin: PROBE_ORIGIN, Accept: '*/*' },
    timeoutMs: PROBE_TIMEOUT_MS,
    maxRedirects: PROBE_MAX_REDIRECTS,
  });

export const getJson = async (fetch: Fetcher, url: string): Promise<JsonProbe> => {
  const elapsed = startTimer();
  const result = await fetchText(fetch, url);
  if (!result.ok) {
    return {
      url,
      ok: false,
      status: null,
      ms: elapsed(),
      error: describeError(result.error),
      json: null,
      response: null,
      fetchError: result.error,
    };
  }
  const response = result.value;
  const base = { url, status: response.status, ms: response.ms, response, fetchError: null };
  if (response.status !== 200) {
    return { ...base, ok: false, error: `http_${response.status}`, json: null };
  }
  try {
    return { ...base, ok: true, error: null, json: JSON.parse(response.body) };
  } catch {
    return { ...base, ok: false, error: 'invalid_json', json: null };
  }
};

export const toEndpointProbe = ({ url, ok, status, ms, error }: JsonProbe): EndpointProbe => ({
  url,
  ok,
  status,
  ms: Math.round(ms),
  error,
});
