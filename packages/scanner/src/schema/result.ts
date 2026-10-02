import { z } from 'zod';

export const ERROR_CODES = [
  'INVALID_INPUT',
  'NOT_FOUND',
  'UPSTREAM_FAILED',
  'UPSTREAM_TIMEOUT',
  'RATE_LIMITED',
  'POLICY_BLOCKED',
  'CONFLICT',
  'INTERNAL',
] as const;
export const ErrorCode = z.enum(ERROR_CODES);
export type ErrorCode = z.infer<typeof ErrorCode>;

export const AppError = z.object({
  code: ErrorCode,
  message: z.string(),
  meta: z.record(z.string(), z.unknown()).optional(),
});
export type AppError = z.infer<typeof AppError> & { cause?: unknown };

export type Result<T, E = AppError> = { ok: true; value: T } | { ok: false; error: E };

export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

export const appError = (
  code: ErrorCode,
  message: string,
  meta?: Record<string, unknown>,
): AppError => ({ code, message, meta });

export const isAppError = (value: unknown): value is AppError => AppError.safeParse(value).success;

export const toAppError = (error: unknown): AppError => {
  if (isAppError(error)) return error;
  const message = error instanceof Error ? error.message : 'An internal error occurred';
  return { code: 'INTERNAL', message, cause: error };
};
