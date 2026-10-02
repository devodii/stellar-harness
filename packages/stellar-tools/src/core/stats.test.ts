import { describe, expect, it } from 'vitest';
import { HttpStats } from './stats';

describe('HttpStats', () => {
  it('counts per host and totals across hosts', () => {
    const stats = new HttpStats();
    stats.increment('a', 'requests');
    stats.increment('a', 'network', 2);
    stats.increment('b', 'cacheHits');
    expect(stats.byHost().a).toMatchObject({ requests: 1, network: 2, cacheHits: 0 });
    expect(stats.totals()).toMatchObject({ requests: 1, network: 2, cacheHits: 1, gaps: 0 });
  });

  it('returns copies and resets', () => {
    const stats = new HttpStats();
    stats.increment('a', 'gaps');
    const snapshot = stats.byHost();
    stats.increment('a', 'gaps');
    expect(snapshot.a?.gaps).toBe(1);
    stats.reset();
    expect(stats.byHost()).toEqual({});
  });
});
