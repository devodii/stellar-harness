export type ImportCounts = {
  scanned: number;
  inserted: number;
  existing: number;
  invalid: number;
  bytes: number;
};

export const emptyCounts = (): ImportCounts => ({
  scanned: 0,
  inserted: 0,
  existing: 0,
  invalid: 0,
  bytes: 0,
});

export type ImportOptions = {
  limit?: number;
  dryRun?: boolean;
  onProgress?: (label: string, counts: ImportCounts) => void;
};

const MB = 1024 * 1024;

export const formatCounts = (label: string, counts: ImportCounts, elapsedMs: number): string => {
  const seconds = Math.max(elapsedMs / 1000, 0.001);
  const rate = (counts.scanned / seconds).toFixed(0);
  const mbps = (counts.bytes / MB / seconds).toFixed(1);
  return [
    `[${label}]`,
    `scanned ${counts.scanned}`,
    `inserted ${counts.inserted}`,
    `existing ${counts.existing}`,
    `invalid ${counts.invalid}`,
    `${(counts.bytes / MB).toFixed(1)} MB`,
    `${rate}/s`,
    `${mbps} MB/s`,
    `${seconds.toFixed(1)}s`,
  ].join(' ');
};

export const mapLimit = async <T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results = new Array<R>(items.length);
  let next = 0;
  const lanes = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index] as T);
    }
  });
  await Promise.all(lanes);
  return results;
};
