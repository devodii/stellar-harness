import { describe, expect, it } from 'vitest';
import {
  backoffDelay,
  DEFAULT_RETRY,
  isRetryableStatus,
  parseRetryAfter,
  retryDelay,
} from './retry';

describe('isRetryableStatus', () => {
  it('retries 429 and 5xx only', () => {
    expect([429, 500, 502, 503, 504].every(isRetryableStatus)).toBe(true);
    expect([200, 301, 400, 404, 410].some(isRetryableStatus)).toBe(false);
  });
});

describe('backoffDelay', () => {
  it('uses full jitter under an exponential ceiling', () => {
    expect(backoffDelay(1, DEFAULT_RETRY, () => 0.999)).toBe(499);
    expect(backoffDelay(3, DEFAULT_RETRY, () => 0.5)).toBe(1000);
    expect(backoffDelay(4, DEFAULT_RETRY, () => 0)).toBe(0);
  });

  it('caps the ceiling at maxDelayMs', () => {
    expect(backoffDelay(30, DEFAULT_RETRY, () => 0.999)).toBe(29_970);
  });
});

describe('parseRetryAfter', () => {
  const now = Date.parse('2026-10-02T00:00:00Z');

  it('reads delta seconds', () => {
    expect(parseRetryAfter('3', now)).toBe(3000);
    expect(parseRetryAfter(' 1.5 ', now)).toBe(1500);
  });

  it('reads an http date', () => {
    expect(parseRetryAfter('Fri, 02 Oct 2026 00:00:10 GMT', now)).toBe(10_000);
    expect(parseRetryAfter('Thu, 01 Oct 2026 00:00:00 GMT', now)).toBe(0);
  });

  it('ignores missing or garbage values', () => {
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('soon', now)).toBeNull();
  });
});

describe('retryDelay', () => {
  it('waits at least as long as Retry-After asks, within a cap', () => {
    expect(retryDelay(1, '5', DEFAULT_RETRY, () => 0)).toBe(5000);
    expect(retryDelay(1, '9999', DEFAULT_RETRY, () => 0)).toBe(DEFAULT_RETRY.maxRetryAfterMs);
    expect(retryDelay(2, null, DEFAULT_RETRY, () => 0.5)).toBe(500);
  });
});
