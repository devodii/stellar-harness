import { describe, expect, it } from 'vitest';
import { planChunks } from './chunks';
import { ContiguousProgress, remainingChunks, resumableFrom } from './progress';

const chunks = planChunks(100, 139, { chunkLedgers: 10 });
const done = (id: number) => ({ chunk: chunks[id] ?? { id, start: 0, end: 0 } });

describe('ContiguousProgress', () => {
  it('flushes chunks only in ledger order', () => {
    const progress = new ContiguousProgress(chunks, 99);
    expect(progress.complete(done(1))).toEqual([]);
    expect(progress.complete(done(2))).toEqual([]);
    expect(progress.completedThrough).toBe(99);
    expect(progress.pendingCount).toBe(2);

    expect(progress.complete(done(0)).map((r) => r.chunk.id)).toEqual([0, 1, 2]);
    expect(progress.completedThrough).toBe(129);
    expect(progress.pendingCount).toBe(0);

    expect(progress.complete(done(3)).map((r) => r.chunk.id)).toEqual([3]);
    expect(progress.completedThrough).toBe(139);
  });

  it('holds the checkpoint behind a gap left by a failed chunk', () => {
    const progress = new ContiguousProgress(chunks, 99);
    progress.complete(done(0));
    progress.complete(done(2));
    progress.complete(done(3));
    expect(progress.completedThrough).toBe(109);
  });

  it('starts from a resumed position', () => {
    const rest = remainingChunks(chunks, 119);
    expect(rest.map((c) => c.id)).toEqual([2, 3]);
    const progress = new ContiguousProgress(rest, 119);
    progress.complete(done(2));
    expect(progress.completedThrough).toBe(129);
  });
});

describe('resumableFrom', () => {
  const plan = { startLedger: 100, endLedger: 139, chunkLedgers: 10, sampleEvery: 1 };

  it('resumes when the plan matches', () => {
    expect(resumableFrom({ ...plan, completedThrough: 119 }, plan)).toBe(119);
  });

  it('starts over when the window changed', () => {
    expect(resumableFrom({ ...plan, endLedger: 150, completedThrough: 119 }, plan)).toBe(99);
  });

  it('starts over without a checkpoint', () => {
    expect(resumableFrom(undefined, plan)).toBe(99);
  });
});
