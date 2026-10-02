import { type AppError, appError, type ErrorCode } from '@harness/schema';

export const FAILURE_KINDS = [
  'timeout',
  'tls',
  'dns',
  'network',
  'http',
  'redirect',
  'parse',
  'schema',
] as const;
export type FailureKind = (typeof FAILURE_KINDS)[number];

export type FetchFailure = {
  kind: Extract<FailureKind, 'timeout' | 'tls' | 'dns' | 'network'>;
  code: string | null;
  message: string;
  retryable: boolean;
};

const TLS_CODE = /CERT|SSL|TLS/;
const PERMANENT_DNS_CODES = new Set(['ENOTFOUND']);

const errorCode = (error: unknown): string | null => {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    if ('code' in current && typeof current.code === 'string') return current.code;
    current = current.cause;
  }
  return null;
};

const deepestMessage = (error: unknown): string => {
  let current: unknown = error;
  let message = error instanceof Error ? error.message : String(error);
  for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
    message = current.message || message;
    current = current.cause;
  }
  return message;
};

export const classifyFetchError = (error: unknown): FetchFailure => {
  const message = deepestMessage(error);
  if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return { kind: 'timeout', code: null, message, retryable: true };
  }
  const code = errorCode(error);
  if (code && TLS_CODE.test(code)) return { kind: 'tls', code, message, retryable: false };
  if (code && (code.startsWith('EAI_') || PERMANENT_DNS_CODES.has(code))) {
    return { kind: 'dns', code, message, retryable: !PERMANENT_DNS_CODES.has(code) };
  }
  return { kind: 'network', code, message, retryable: true };
};

export type HttpErrorMeta = {
  kind: FailureKind;
  url: string;
  host: string;
  attempts: number;
  status?: number;
  code?: string | null;
  gap?: boolean;
};

const codeForStatus = (status: number): ErrorCode => {
  if (status === 404 || status === 410) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  return 'UPSTREAM_FAILED';
};

export const httpError = (message: string, meta: HttpErrorMeta): AppError => {
  if (meta.kind === 'timeout') return appError('UPSTREAM_TIMEOUT', message, meta);
  if (meta.status !== undefined) return appError(codeForStatus(meta.status), message, meta);
  return appError('UPSTREAM_FAILED', message, meta);
};

export const failureKindOf = (error: AppError): FailureKind | null => {
  const kind = error.meta?.kind;
  return typeof kind === 'string' && (FAILURE_KINDS as readonly string[]).includes(kind)
    ? (kind as FailureKind)
    : null;
};
