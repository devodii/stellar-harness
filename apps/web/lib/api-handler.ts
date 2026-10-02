import 'server-only';
import {
  type AppError,
  appError,
  type ErrorCode,
  isAppError,
  type Result,
  toAppError,
} from '@harness/schema';
import { type NextRequest, NextResponse } from 'next/server';
import type { z } from 'zod';
import { childLogger } from './log';
import { clientIp, consumeRateLimit } from './rate-limit';

export type AuthScope = 'public';

export type ResolvedAuth = { type: 'public' };

export type HandlerArgs<TBody, TParams, TQuery> = {
  body: TBody;
  params: TParams;
  query: TQuery;
  auth: ResolvedAuth;
  req: NextRequest;
  requestId: string;
};

export type HandlerConfig<TBody, TParams, TQuery> = {
  name: string;
  schema?: {
    body?: z.ZodType<TBody>;
    params?: z.ZodType<TParams>;
    query?: z.ZodType<TQuery>;
  };
  mcp?: { name: string; description: string };
  auth?: readonly AuthScope[];
  rateLimit?: {
    key?: (args: { auth: ResolvedAuth; req: NextRequest }) => string;
    limit: number;
    windowSeconds: number;
  };
  cors?: boolean;
  convertToSnakeCase?: boolean;
  cacheControl?: string;
  handler: (
    args: HandlerArgs<TBody, TParams, TQuery>,
  ) => Promise<Result<unknown> | Response> | Result<unknown> | Response;
};

type AnyHandlerConfig = HandlerConfig<unknown, unknown, unknown>;

export const routeRegistry = new Map<string, AnyHandlerConfig>();
export const mcpToolsRegistry = new Map<string, AnyHandlerConfig>();

const STATUS_BY_CODE: Record<ErrorCode, number> = {
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  POLICY_BLOCKED: 403,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL: 500,
  UPSTREAM_FAILED: 502,
  UPSTREAM_TIMEOUT: 504,
};

const GENERIC_MESSAGE = 'An internal error occurred.';

const getCorsHeaders = (origin: string | null): Record<string, string> =>
  origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        Vary: 'Origin',
      }
    : {};

export const createOptionsHandler = () => (req: NextRequest) =>
  new NextResponse(null, { status: 204, headers: getCorsHeaders(req.headers.get('origin')) });

const resolveAuth = async (_scopes: readonly AuthScope[]): Promise<ResolvedAuth> => ({
  type: 'public',
});

export const toSnakeCase = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(toSnakeCase);
  return Object.fromEntries(
    Object.entries(value).map(([key, inner]) => [
      key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`),
      toSnakeCase(inner),
    ]),
  );
};

export const readQuery = (searchParams: URLSearchParams): Record<string, string | string[]> => {
  const query: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1 ? values : (values[0] ?? '');
  }
  return query;
};

const validate = <T>(schema: z.ZodType<T> | undefined, raw: unknown, what: string): T => {
  if (!schema) return raw as T;
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  const path = issue?.path.length ? `${issue.path.join('.')}: ` : '';
  throw appError('INVALID_INPUT', `${path}${issue?.message ?? `Invalid ${what}`}`);
};

export const apiHandler = <TBody = unknown, TParams = unknown, TQuery = unknown>(
  config: HandlerConfig<TBody, TParams, TQuery>,
) => {
  if (routeRegistry.has(config.name)) {
    throw new Error(`Route "${config.name}" is already registered, route names must be unique`);
  }
  routeRegistry.set(config.name, config as unknown as AnyHandlerConfig);
  if (config.mcp) mcpToolsRegistry.set(config.mcp.name, config as unknown as AnyHandlerConfig);

  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string | string[]>> },
  ): Promise<Response> => {
    const requestId = crypto.randomUUID();
    const log = childLogger(requestId, { route: config.name });
    const corsHeaders = config.cors ? getCorsHeaders(req.headers.get('origin')) : {};
    let rateHeaders: Record<string, string> = {};

    try {
      const auth = await resolveAuth(config.auth ?? ['public']);

      if (config.rateLimit) {
        const key = config.rateLimit.key?.({ auth, req }) ?? clientIp(req.headers);
        const rl = consumeRateLimit(
          `${config.name}:${key}`,
          config.rateLimit.limit,
          config.rateLimit.windowSeconds,
        );
        rateHeaders = {
          'X-RateLimit-Limit': String(rl.limit),
          'X-RateLimit-Remaining': String(rl.remaining),
          'X-RateLimit-Reset': String(Math.floor(rl.reset.getTime() / 1000)),
        };
        if (!rl.allowed) throw appError('RATE_LIMITED', 'Too many requests');
      }

      const body = config.schema?.body
        ? validate(config.schema.body, await req.json().catch(() => ({})), 'body')
        : ({} as TBody);
      const params = validate(config.schema?.params, await context.params, 'params');
      const query = validate(config.schema?.query, readQuery(req.nextUrl.searchParams), 'query');

      const result = await config.handler({ body, params, query, auth, req, requestId });
      if (result instanceof Response) return result;
      if (!result.ok) throw result.error;

      const payload = config.convertToSnakeCase ? toSnakeCase(result.value) : result.value;
      return NextResponse.json(payload, {
        headers: {
          ...corsHeaders,
          ...rateHeaders,
          'cache-control': config.cacheControl ?? 'no-store',
        },
      });
    } catch (error) {
      const exposed = isAppError(error);
      const appErr: AppError = toAppError(error);
      const status = STATUS_BY_CODE[appErr.code];
      const message = exposed ? appErr.message : GENERIC_MESSAGE;
      log.error(
        { error: { code: appErr.code, message: appErr.message }, path: req.nextUrl.pathname },
        'api handler failure',
      );
      return NextResponse.json(
        { error: { code: appErr.code, message } },
        { status, headers: { ...corsHeaders, ...rateHeaders } },
      );
    }
  };
};
