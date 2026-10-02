export const chunk = <T>(items: readonly T[], size: number): T[][] => {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) {
    batches.push(items.slice(start, start + size));
  }
  return batches;
};

export type BatchLimits<T> = { maxRows: number; maxBytes?: number; sizeOf?: (item: T) => number };

export async function* batched<T>(
  items: AsyncIterable<T> | Iterable<T>,
  { maxRows, maxBytes = Number.POSITIVE_INFINITY, sizeOf = () => 0 }: BatchLimits<T>,
): AsyncIterable<T[]> {
  let batch: T[] = [];
  let bytes = 0;
  for await (const item of items) {
    const size = sizeOf(item);
    if (batch.length > 0 && (batch.length >= maxRows || bytes + size > maxBytes)) {
      yield batch;
      batch = [];
      bytes = 0;
    }
    batch.push(item);
    bytes += size;
  }
  if (batch.length > 0) yield batch;
}
