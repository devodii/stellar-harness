import type { HostStats } from '@harness/stellar-tools';
import type { CensusRun } from '../../report/inputs';
import type { ScanContext } from '../context';

export type Measured<T> = { value: T; run: CensusRun };

export const measure = async <T>(
  ctx: ScanContext,
  census: string,
  body: () => Promise<T>,
): Promise<Measured<T>> => {
  const before: HostStats = ctx.stats();
  const gapsBefore = ctx.gaps.length;
  const started = Date.now();
  const value = await body();
  const after = ctx.stats();
  return {
    value,
    run: {
      census,
      wallMs: Date.now() - started,
      requests: after.requests - before.requests,
      networkCalls: after.network - before.network,
      cachedHits: after.cacheHits - before.cacheHits,
      gaps: ctx.gaps.length - gapsBefore,
    },
  };
};
