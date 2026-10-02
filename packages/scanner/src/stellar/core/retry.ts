export type RetryPolicy = {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  maxRetryAfterMs: number;
};

export const DEFAULT_RETRY: RetryPolicy = {
  maxAttempts: 6,
  baseDelayMs: 500,
  maxDelayMs: 30_000,
  maxRetryAfterMs: 120_000,
};

export const isRetryableStatus = (status: number): boolean => status === 429 || status >= 500;

export const backoffDelay = (
  attempt: number,
  policy: RetryPolicy,
  random: () => number = Math.random,
): number => {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, attempt - 1));
  return Math.floor(random() * ceiling);
};

export const parseRetryAfter = (
  value: string | null | undefined,
  now = Date.now(),
): number | null => {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Math.round(Number(trimmed) * 1000);
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
};

export const retryDelay = (
  attempt: number,
  retryAfter: string | null | undefined,
  policy: RetryPolicy,
  random: () => number = Math.random,
  now = Date.now(),
): number => {
  const backoff = backoffDelay(attempt, policy, random);
  const requested = parseRetryAfter(retryAfter, now);
  if (requested === null) return backoff;
  return Math.max(backoff, Math.min(requested, policy.maxRetryAfterMs));
};
