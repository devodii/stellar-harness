import type { Fetcher } from './ports';

export type Limiter = <T>(task: () => Promise<T>) => Promise<T>;

export const semaphore = (size: number): Limiter => {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async (task) => {
    if (active >= size) await new Promise<void>((resolve) => waiting.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      active -= 1;
      waiting.shift()?.();
    }
  };
};

export type KeyedLimiter = <T>(key: string, task: () => Promise<T>) => Promise<T>;

export const keyedLimiter = (size: number): KeyedLimiter => {
  const limiters = new Map<string, Limiter>();
  return (key, task) => {
    const limiter = limiters.get(key) ?? semaphore(size);
    limiters.set(key, limiter);
    return limiter(task);
  };
};

const hostKey = (url: string): string => {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return url;
  }
};

export const limitFetchPerHost = (fetch: Fetcher, perHost: number): Fetcher => {
  const limit = keyedLimiter(perHost);
  return (url, init) => limit(hostKey(url), () => fetch(url, init));
};
