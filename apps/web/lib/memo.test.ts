import { describe, expect, it, vi } from 'vitest';
import { memo, ttlCache } from './memo';

describe('memo', () => {
  it('loads once', () => {
    const load = vi.fn(() => ({ n: 1 }));
    const get = memo(load);
    expect(get()).toBe(get());
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('ttlCache', () => {
  it('reuses the value inside the ttl and reloads after', async () => {
    let now = 0;
    const cache = ttlCache<number>(1000, () => now);
    const load = vi.fn(async () => now);
    expect(await cache.get(load)).toBe(0);
    now = 999;
    expect(await cache.get(load)).toBe(0);
    now = 1000;
    expect(await cache.get(load)).toBe(1000);
    expect(load).toHaveBeenCalledTimes(2);
  });

  it('drops failed loads so the next call retries', async () => {
    const cache = ttlCache<number>(60_000, () => 0);
    await expect(cache.get(async () => Promise.reject(new Error('down')))).rejects.toThrow('down');
    expect(await cache.get(async () => 7)).toBe(7);
  });
});
