import { describe, expect, it } from 'vitest';
import { HostLimiter, Semaphore } from './semaphore';

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

const track = () => {
  let active = 0;
  let peak = 0;
  const task = async () => {
    active += 1;
    peak = Math.max(peak, active);
    await tick();
    active -= 1;
  };
  return { task, peak: () => peak };
};

describe('Semaphore', () => {
  it('caps concurrent tasks at the limit', async () => {
    const semaphore = new Semaphore(3);
    const tracker = track();
    await Promise.all(Array.from({ length: 10 }, () => semaphore.run(tracker.task)));
    expect(tracker.peak()).toBe(3);
    expect(semaphore.active).toBe(0);
  });

  it('releases the slot when a task throws', async () => {
    const semaphore = new Semaphore(1);
    await expect(semaphore.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(await semaphore.run(async () => 'next')).toBe('next');
  });

  it('ignores a double release', async () => {
    const semaphore = new Semaphore(1);
    const release = await semaphore.acquire();
    release();
    release();
    expect(semaphore.active).toBe(0);
  });

  it('admits waiters when the limit is raised', async () => {
    const semaphore = new Semaphore(1);
    await semaphore.acquire();
    let admitted = false;
    const waiting = semaphore.acquire().then(() => {
      admitted = true;
    });
    semaphore.setLimit(2);
    await waiting;
    expect(admitted).toBe(true);
  });

  it('rejects a non positive limit', () => {
    expect(() => new Semaphore(0)).toThrow(RangeError);
  });
});

describe('HostLimiter', () => {
  it('limits each host independently and uses the default for unknown hosts', async () => {
    const limiter = new HostLimiter({ limits: { 'horizon.stellar.org': 4 }, defaultLimit: 2 });
    const horizon = track();
    const anchor = track();
    await Promise.all([
      ...Array.from({ length: 12 }, () => limiter.run('horizon.stellar.org', horizon.task)),
      ...Array.from({ length: 12 }, () => limiter.run('anchor.example', anchor.task)),
    ]);
    expect(horizon.peak()).toBe(4);
    expect(anchor.peak()).toBe(2);
  });

  it('applies the global cap across hosts', async () => {
    const limiter = new HostLimiter({ defaultLimit: 2, globalLimit: 3 });
    const all = track();
    await Promise.all(Array.from({ length: 20 }, (_, i) => limiter.run(`host-${i % 5}`, all.task)));
    expect(all.peak()).toBe(3);
  });

  it('changes a host limit at runtime', () => {
    const limiter = new HostLimiter();
    limiter.setLimit('a', 7);
    expect(limiter.limitFor('a')).toBe(7);
    expect(limiter.semaphoreFor('a').limit).toBe(7);
  });
});
