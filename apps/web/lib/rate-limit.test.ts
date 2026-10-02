import { describe, expect, it } from 'vitest';
import { clientIp, createSlidingWindowLimiter } from './rate-limit';

describe('sliding window limiter', () => {
  it('allows up to the limit inside the window then blocks', () => {
    let now = 0;
    const consume = createSlidingWindowLimiter(() => now);
    expect(consume('ip', 2, 10).allowed).toBe(true);
    expect(consume('ip', 2, 10).allowed).toBe(true);
    const blocked = consume('ip', 2, 10);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    now = 10_001;
    expect(consume('ip', 2, 10).allowed).toBe(true);
  });

  it('keeps keys independent', () => {
    const consume = createSlidingWindowLimiter(() => 0);
    consume('a', 1, 60);
    expect(consume('b', 1, 60).allowed).toBe(true);
  });

  it('reads the first forwarded address', () => {
    expect(clientIp(new Headers({ 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }))).toBe('1.2.3.4');
    expect(clientIp(new Headers())).toBe('local');
  });
});
