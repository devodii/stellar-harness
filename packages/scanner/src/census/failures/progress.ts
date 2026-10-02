import { z } from 'zod';
import type { LedgerChunk } from './chunks';

export const FailuresCheckpoint = z.object({
  startLedger: z.number().int().positive(),
  endLedger: z.number().int().positive(),
  chunkLedgers: z.number().int().positive(),
  sampleEvery: z.number().int().positive(),
  completedThrough: z.number().int().nonnegative(),
});
export type FailuresCheckpoint = z.infer<typeof FailuresCheckpoint>;

export const resumableFrom = (
  previous: FailuresCheckpoint | undefined,
  plan: Omit<FailuresCheckpoint, 'completedThrough'>,
): number => {
  if (!previous) return plan.startLedger - 1;
  const samePlan =
    previous.startLedger === plan.startLedger &&
    previous.endLedger === plan.endLedger &&
    previous.chunkLedgers === plan.chunkLedgers &&
    previous.sampleEvery === plan.sampleEvery;
  return samePlan ? previous.completedThrough : plan.startLedger - 1;
};

export const remainingChunks = (chunks: LedgerChunk[], completedThrough: number): LedgerChunk[] =>
  chunks.filter((chunk) => chunk.end > completedThrough);

export class ContiguousProgress<T extends { chunk: LedgerChunk }> {
  private readonly order: LedgerChunk[];
  private readonly pending = new Map<number, T>();
  private index = 0;
  private through: number;

  constructor(chunks: LedgerChunk[], completedThrough: number) {
    this.order = [...chunks].sort((a, b) => a.start - b.start);
    this.through = completedThrough;
  }

  get completedThrough(): number {
    return this.through;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  complete(result: T): T[] {
    this.pending.set(result.chunk.id, result);
    const ready: T[] = [];
    while (this.index < this.order.length) {
      const next = this.order[this.index];
      const done = next && this.pending.get(next.id);
      if (!next || !done) break;
      this.pending.delete(next.id);
      ready.push(done);
      this.through = next.end;
      this.index += 1;
    }
    return ready;
  }
}
