export const STAT_FIELDS = [
  'requests',
  'cacheHits',
  'network',
  'retries',
  'gaps',
  'errors',
] as const;
export type StatField = (typeof STAT_FIELDS)[number];
export type HostStats = Record<StatField, number>;

const emptyStats = (): HostStats => ({
  requests: 0,
  cacheHits: 0,
  network: 0,
  retries: 0,
  gaps: 0,
  errors: 0,
});

export class HttpStats {
  #byHost = new Map<string, HostStats>();

  increment(host: string, field: StatField, by = 1): void {
    let stats = this.#byHost.get(host);
    if (!stats) {
      stats = emptyStats();
      this.#byHost.set(host, stats);
    }
    stats[field] += by;
  }

  byHost(): Record<string, HostStats> {
    return Object.fromEntries([...this.#byHost].map(([host, stats]) => [host, { ...stats }]));
  }

  totals(): HostStats {
    const totals = emptyStats();
    for (const stats of this.#byHost.values()) {
      for (const field of STAT_FIELDS) totals[field] += stats[field];
    }
    return totals;
  }

  reset(): void {
    this.#byHost.clear();
  }
}
