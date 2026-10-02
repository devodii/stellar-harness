export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: Date;
}

const MAX_KEYS = 10_000;

export const createSlidingWindowLimiter = (now: () => number = Date.now) => {
  const hits = new Map<string, number[]>();

  return (key: string, limit: number, windowSeconds: number): RateLimitResult => {
    const current = now();
    const windowStart = current - windowSeconds * 1000;
    const recent = (hits.get(key) ?? []).filter((at) => at > windowStart);
    const allowed = recent.length < limit;
    if (allowed) recent.push(current);
    hits.delete(key);
    hits.set(key, recent);
    if (hits.size > MAX_KEYS) {
      const oldest = hits.keys().next().value;
      if (oldest !== undefined) hits.delete(oldest);
    }
    const resetAt = (recent[0] ?? current) + windowSeconds * 1000;
    return {
      allowed,
      limit,
      remaining: Math.max(0, limit - recent.length),
      reset: new Date(resetAt),
    };
  };
};

export const consumeRateLimit = createSlidingWindowLimiter();

export const clientIp = (headers: Headers): string =>
  headers.get('x-forwarded-for')?.split(',')[0]?.trim() || headers.get('x-real-ip') || 'local';
