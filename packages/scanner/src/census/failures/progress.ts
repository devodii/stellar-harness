import { z } from 'zod';
import type { LedgerChunk } from './chunks';

export const FailuresCheckpoint = z.object({
  startLedger: z.number().int().positive(),
  endLedger: z.number().int().positive(),
  chunkLedgers: z.number().int().positive(),
  sampleEvery: z.number().int().positive(),
  completedThrough: z.number().int().nonnegative(),
  completedChunkIds: z.array(z.number().int().nonnegative()).default([]),
});
export type FailuresCheckpoint = z.infer<typeof FailuresCheckpoint>;

export type ChunkPlan = Pick<
  FailuresCheckpoint,
  'startLedger' | 'endLedger' | 'chunkLedgers' | 'sampleEvery'
>;

export type ResumeState = { completedThrough: number; completedChunkIds: number[] };

export const resumeStateFor = (
  previous: FailuresCheckpoint | undefined,
  plan: ChunkPlan,
): ResumeState => {
  const fresh = { completedThrough: plan.startLedger - 1, completedChunkIds: [] };
  if (!previous) return fresh;
  const samePlan =
    previous.startLedger === plan.startLedger &&
    previous.endLedger === plan.endLedger &&
    previous.chunkLedgers === plan.chunkLedgers &&
    previous.sampleEvery === plan.sampleEvery;
  if (!samePlan) return fresh;
  return {
    completedThrough: previous.completedThrough,
    completedChunkIds: [...previous.completedChunkIds],
  };
};

export const isResuming = (state: ResumeState, plan: ChunkPlan): boolean =>
  state.completedThrough >= plan.startLedger || state.completedChunkIds.length > 0;

export const remainingChunks = (chunks: LedgerChunk[], state: ResumeState): LedgerChunk[] => {
  const done = new Set(state.completedChunkIds);
  return chunks.filter((chunk) => chunk.end > state.completedThrough && !done.has(chunk.id));
};

export class ContiguousProgress<T extends { chunk: LedgerChunk }> {
  private readonly order: LedgerChunk[];
  private readonly pending = new Map<number, T>();
  private readonly alreadyDone: ReadonlySet<number>;
  private index = 0;
  private through: number;

  constructor(chunks: LedgerChunk[], completedThrough: number, alreadyDone: number[] = []) {
    this.order = chunks
      .filter((chunk) => chunk.end > completedThrough)
      .sort((a, b) => a.start - b.start);
    this.through = completedThrough;
    this.alreadyDone = new Set(alreadyDone);
    this.advance();
  }

  get completedThrough(): number {
    return this.through;
  }

  get pendingCount(): number {
    return this.pending.size;
  }

  complete(result: T): T[] {
    this.pending.set(result.chunk.id, result);
    return this.advance();
  }

  private advance(): T[] {
    const ready: T[] = [];
    while (this.index < this.order.length) {
      const next = this.order[this.index];
      if (!next) break;
      const done = this.pending.get(next.id);
      if (done) {
        this.pending.delete(next.id);
        ready.push(done);
      } else if (!this.alreadyDone.has(next.id)) break;
      this.through = next.end;
      this.index += 1;
    }
    return ready;
  }

  drain(): T[] {
    const rest = [...this.pending.values()].sort((a, b) => a.chunk.start - b.chunk.start);
    this.pending.clear();
    return rest;
  }
}
