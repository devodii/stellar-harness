import type { z } from 'zod';
import { type AppError, err, ok, type Result } from '../../schema';
import {
  type Cache,
  type CacheEntry,
  cacheKey,
  isCacheableStatus,
  NoCache,
  pickCachedHeaders,
} from './cache';
import { classifyFetchError, httpError } from './errors';
import { type HttpLogger, stderrLogger } from './log';
import { DEFAULT_RETRY, isRetryableStatus, type RetryPolicy, retryDelay } from './retry';
import { HostLimiter } from './semaphore';
import { HttpStats } from './stats';

export const USER_AGENT = 'stellar-harness/0.1 (+https://github.com/devodii/stellar-harness)';
export const DEFAULT_TIMEOUT_MS = 30_000;
export const DEFAULT_MAX_REDIRECTS = 3;

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

export type HttpMethod = 'GET' | 'POST' | 'HEAD';

export type HttpResponse = {
  status: number;
  url: string;
  finalUrl: string;
  redirects: number;
  headers: Record<string, string>;
  body: string;
  cached: boolean;
  fetchedAt: string;
  ms: number;
  attempts: number;
};

export type HttpRequest = {
  url: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRedirects?: number;
  maxAttempts?: number;
  cache?: boolean;
  cacheable?: (response: HttpResponse) => boolean;
  transformBody?: (body: string) => string;
};

export type RequestOptions = Omit<HttpRequest, 'url' | 'method' | 'body'>;

export type HttpGap = {
  url: string;
  method: HttpMethod;
  host: string;
  attempts: number;
  reason: string;
  status?: number;
};

export type HttpOptions = {
  limiter?: HostLimiter;
  cache?: Cache;
  log?: HttpLogger;
  retry?: Partial<RetryPolicy>;
  onGap?: (gap: HttpGap) => void;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
  defaultTimeoutMs?: number;
  reliableHosts?: ReadonlySet<string>;
};

export type Http = {
  request(input: HttpRequest): Promise<Result<HttpResponse>>;
  getJson<S extends z.ZodType>(
    url: string,
    schema: S,
    opts?: RequestOptions,
  ): Promise<Result<z.infer<S>>>;
  postJson<S extends z.ZodType>(
    url: string,
    body: unknown,
    schema: S,
    opts?: RequestOptions,
  ): Promise<Result<z.infer<S>>>;
  getText(url: string, opts?: RequestOptions): Promise<Result<string>>;
  readonly stats: HttpStats;
  readonly limiter: HostLimiter;
};

type RawResponse = {
  status: number;
  finalUrl: string;
  redirects: number;
  headers: Headers;
  body: string;
};

type Attempt = { ok: true; response: RawResponse } | { ok: false; error: unknown };

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const pathOf = (url: URL): string => `${url.pathname}${url.search}`;

const isSuccess = (status: number): boolean => status >= 200 && status < 300;

const fromEntry = (url: string, entry: CacheEntry): HttpResponse => ({
  status: entry.status,
  url,
  finalUrl: entry.url,
  redirects: 0,
  headers: entry.headers,
  body: entry.body,
  cached: true,
  fetchedAt: entry.fetchedAt,
  ms: 0,
  attempts: 0,
});

export const statusError = (response: HttpResponse): AppError => {
  const target = new URL(response.finalUrl);
  return httpError(`HTTP ${response.status} from ${target.host}${target.pathname}`, {
    kind: 'http',
    url: response.finalUrl,
    host: target.host,
    attempts: response.attempts,
    status: response.status,
  });
};

export const parseJsonResponse = <S extends z.ZodType>(
  response: HttpResponse,
  schema: S,
): Result<z.infer<S>> => {
  if (!isSuccess(response.status)) return err(statusError(response));
  const host = new URL(response.finalUrl).host;
  const meta = { url: response.finalUrl, host, attempts: response.attempts };
  let json: unknown;
  try {
    json = JSON.parse(response.body);
  } catch {
    return err(httpError(`Invalid JSON from ${host}`, { ...meta, kind: 'parse' }));
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return ok(parsed.data);
  const issue = parsed.error.issues[0];
  const where = issue ? `${issue.path.join('.') || '(root)'}: ${issue.message}` : 'unknown';
  return err(
    httpError(`Unexpected response shape from ${host} at ${where}`, { ...meta, kind: 'schema' }),
  );
};

export const createHttp = (options: HttpOptions = {}): Http => {
  const limiter = options.limiter ?? new HostLimiter();
  const cache = options.cache ?? new NoCache();
  const log = options.log ?? stderrLogger;
  const policy: RetryPolicy = { ...DEFAULT_RETRY, ...options.retry };
  const doFetch = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? defaultSleep;
  const random = options.random ?? Math.random;
  const now = options.now ?? Date.now;
  const defaultTimeoutMs = options.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const stats = new HttpStats();

  const fetchOnce = async (input: HttpRequest, method: HttpMethod): Promise<RawResponse> => {
    const signal = AbortSignal.timeout(input.timeoutMs ?? defaultTimeoutMs);
    const maxRedirects = input.maxRedirects ?? DEFAULT_MAX_REDIRECTS;
    let url = input.url;
    let currentMethod = method;
    let body = input.body;
    for (let redirects = 0; ; redirects += 1) {
      const response = await doFetch(url, {
        method: currentMethod,
        headers: { ...input.headers, 'user-agent': USER_AGENT },
        body,
        redirect: 'manual',
        signal,
      });
      const location = response.headers.get('location');
      if (!REDIRECT_STATUSES.has(response.status) || !location || redirects >= maxRedirects) {
        return {
          status: response.status,
          finalUrl: url,
          redirects,
          headers: response.headers,
          body: currentMethod === 'HEAD' ? '' : await response.text(),
        };
      }
      await response.body?.cancel();
      url = new URL(location, url).toString();
      if (response.status === 303) {
        currentMethod = 'GET';
        body = undefined;
      }
    }
  };

  const request = async (input: HttpRequest): Promise<Result<HttpResponse>> => {
    const method = input.method ?? 'GET';
    const target = new URL(input.url);
    const host = target.host;
    const path = pathOf(target);
    const useCache = input.cache ?? true;
    const key = cacheKey({ method, url: input.url, body: input.body });
    stats.increment(host, 'requests');

    if (useCache) {
      const entry = await cache.get(key);
      if (entry) {
        stats.increment(host, 'cacheHits');
        log({
          ts: new Date(now()).toISOString(),
          host,
          path,
          method,
          status: entry.status,
          ms: 0,
          cached: true,
        });
        return ok(fromEntry(input.url, entry));
      }
    }

    const maxAttempts = Math.max(1, input.maxAttempts ?? policy.maxAttempts);
    const meta = { url: input.url, host };
    for (let attempt = 1; ; attempt += 1) {
      const started = now();
      stats.increment(host, 'network');
      const outcome: Attempt = await limiter.run(host, () =>
        fetchOnce(input, method).then(
          (response): Attempt => ({ ok: true, response }),
          (error: unknown): Attempt => ({ ok: false, error }),
        ),
      );
      const ms = now() - started;
      const ts = new Date(started).toISOString();
      const lastAttempt = attempt >= maxAttempts;

      if (!outcome.ok) {
        const failure = classifyFetchError(outcome.error);
        log({
          ts,
          host,
          path,
          method,
          status: null,
          ms,
          cached: false,
          attempt,
          error: `${failure.kind}: ${failure.message}`,
        });
        const errorMeta = { ...meta, kind: failure.kind, code: failure.code, attempts: attempt };
        const retryable =
          failure.retryable || (failure.kind === 'dns' && !!options.reliableHosts?.has(host));
        if (!retryable) {
          stats.increment(host, 'errors');
          return err(
            httpError(`${failure.kind} failure for ${host}: ${failure.message}`, errorMeta),
          );
        }
        if (lastAttempt) {
          stats.increment(host, 'gaps');
          options.onGap?.({
            ...meta,
            method,
            attempts: attempt,
            reason: `${failure.kind}: ${failure.message}`,
          });
          return err(
            httpError(`Gave up on ${host}${path} after ${attempt} attempts: ${failure.message}`, {
              ...errorMeta,
              gap: true,
            }),
          );
        }
        stats.increment(host, 'retries');
        await sleep(retryDelay(attempt, null, policy, random, now()));
        continue;
      }

      const raw = outcome.response;
      log({ ts, host, path, method, status: raw.status, ms, cached: false, attempt });
      if (isRetryableStatus(raw.status)) {
        if (lastAttempt) {
          stats.increment(host, 'gaps');
          options.onGap?.({
            ...meta,
            method,
            attempts: attempt,
            reason: `HTTP ${raw.status}`,
            status: raw.status,
          });
          return err(
            httpError(`Gave up on ${host}${path} after ${attempt} attempts: HTTP ${raw.status}`, {
              ...meta,
              kind: 'http',
              status: raw.status,
              attempts: attempt,
              gap: true,
            }),
          );
        }
        stats.increment(host, 'retries');
        await sleep(retryDelay(attempt, raw.headers.get('retry-after'), policy, random, now()));
        continue;
      }

      const response: HttpResponse = {
        status: raw.status,
        url: input.url,
        finalUrl: raw.finalUrl,
        redirects: raw.redirects,
        headers: pickCachedHeaders(raw.headers),
        body: input.transformBody ? input.transformBody(raw.body) : raw.body,
        cached: false,
        fetchedAt: ts,
        ms,
        attempts: attempt,
      };
      if (useCache && isCacheableStatus(response.status) && (input.cacheable?.(response) ?? true)) {
        await cache.set(key, {
          fetchedAt: ts,
          status: response.status,
          url: response.finalUrl,
          headers: response.headers,
          body: response.body,
        });
      }
      return ok(response);
    }
  };

  const getJson: Http['getJson'] = async (url, schema, opts = {}) => {
    const response = await request({
      ...opts,
      url,
      method: 'GET',
      headers: { accept: 'application/json', ...opts.headers },
    });
    return response.ok ? parseJsonResponse(response.value, schema) : response;
  };

  const postJson: Http['postJson'] = async (url, body, schema, opts = {}) => {
    const response = await request({
      ...opts,
      url,
      method: 'POST',
      body: JSON.stringify(body),
      headers: { accept: 'application/json', 'content-type': 'application/json', ...opts.headers },
    });
    return response.ok ? parseJsonResponse(response.value, schema) : response;
  };

  const getText: Http['getText'] = async (url, opts = {}) => {
    const response = await request({ ...opts, url, method: 'GET' });
    if (!response.ok) return response;
    return isSuccess(response.value.status)
      ? ok(response.value.body)
      : err(statusError(response.value));
  };

  return { request, getJson, postJson, getText, stats, limiter };
};
