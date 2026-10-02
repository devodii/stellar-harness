import { describe, expect, it } from 'vitest';
import { ok } from '../../schema';
import { keyedLimiter, limitFetchPerHost, semaphore } from './limit';
import type { HttpResponse } from './ports';

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

const tracker = () => {
  let active = 0;
  let peak = 0;
  return {
    get peak() {
      return peak;
    },
    task: async () => {
      active += 1;
      peak = Math.max(peak, active);
      await tick();
      active -= 1;
    },
  };
};

describe('semaphore', () => {
  it('caps concurrent tasks', async () => {
    const limit = semaphore(2);
    const t = tracker();
    await Promise.all(Array.from({ length: 6 }, () => limit(t.task)));
    expect(t.peak).toBe(2);
  });

  it('releases after failures', async () => {
    const limit = semaphore(1);
    await expect(limit(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(await limit(async () => 'next')).toBe('next');
  });
});

describe('keyedLimiter', () => {
  it('limits per key independently', async () => {
    const limit = keyedLimiter(1);
    const a = tracker();
    const b = tracker();
    await Promise.all([
      limit('a', a.task),
      limit('a', a.task),
      limit('b', b.task),
      limit('b', b.task),
    ]);
    expect([a.peak, b.peak]).toEqual([1, 1]);
  });
});

describe('limitFetchPerHost', () => {
  it('allows at most n in-flight requests per host', async () => {
    const perHost = new Map<string, { active: number; peak: number }>();
    const fetch = limitFetchPerHost(async (url) => {
      const host = new URL(url).host;
      const stats = perHost.get(host) ?? { active: 0, peak: 0 };
      perHost.set(host, stats);
      stats.active += 1;
      stats.peak = Math.max(stats.peak, stats.active);
      await tick();
      stats.active -= 1;
      return ok({ url, status: 200, headers: {}, body: '', ms: 1, cached: false } as HttpResponse);
    }, 2);
    await Promise.all(
      ['a.example', 'a.example', 'a.example', 'a.example', 'b.example'].map((h, i) =>
        fetch(`https://${h}/${i}`),
      ),
    );
    expect(perHost.get('a.example')?.peak).toBe(2);
    expect(perHost.get('b.example')?.peak).toBe(1);
  });
});
