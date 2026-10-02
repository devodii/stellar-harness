import { EventEmitter } from 'node:events';
import { describe, expect, it } from 'vitest';
import { type CheckpointState, formatProgress, type Progress, runTasks } from './runner';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('runTasks', () => {
  it('runs every task within the concurrency limit and reports results', async () => {
    let active = 0;
    let peak = 0;
    const results: number[] = [];
    const summary = await runTasks(
      [1, 2, 3, 4, 5, 6, 7],
      async (n) => {
        active += 1;
        peak = Math.max(peak, active);
        await sleep(2);
        active -= 1;
        return n * 10;
      },
      { concurrency: 3, signals: false, onResult: (result) => void results.push(result) },
    );
    expect(peak).toBe(3);
    expect(results.sort((a, b) => a - b)).toEqual([10, 20, 30, 40, 50, 60, 70]);
    expect(summary).toMatchObject({ done: 7, total: 7, failed: 0, interrupted: false });
  });

  it('collects failures instead of throwing', async () => {
    const summary = await runTasks(
      ['ok', 'bad', 'ok'],
      async (task) => {
        if (task === 'bad') throw new Error('boom');
        return task;
      },
      { concurrency: 2, signals: false },
    );
    expect(summary.done).toBe(3);
    expect(summary.failures).toEqual([{ task: 'bad', index: 1, error: new Error('boom') }]);
  });

  it('treats a failing onResult as a task failure', async () => {
    const summary = await runTasks([1], async (n) => n, {
      concurrency: 1,
      signals: false,
      onResult: () => {
        throw new Error('sink down');
      },
    });
    expect(summary.failed).toBe(1);
  });

  it('checkpoints periodically and once more on completion', async () => {
    const saves: Array<CheckpointState<number>> = [];
    await runTasks(
      Array.from({ length: 6 }, (_, i) => i),
      async () => sleep(8),
      {
        concurrency: 1,
        signals: false,
        checkpoint: { every: 15, save: (state) => void saves.push(state) },
      },
    );
    expect(saves.length).toBeGreaterThanOrEqual(2);
    expect(saves.at(-1)?.done).toBe(6);
  });

  it('reports progress with rate and eta', async () => {
    const reports: Progress[] = [];
    let clock = 0;
    await runTasks(
      [1, 2, 3, 4],
      async () => {
        clock += 500;
      },
      {
        concurrency: 1,
        signals: false,
        now: () => clock,
        onProgress: (progress) => void reports.push(progress),
      },
    );
    expect(reports.at(-1)).toMatchObject({ done: 4, total: 4, ratePerSecond: 2, etaSeconds: 0 });
  });

  it('stops scheduling on SIGINT and flushes a final checkpoint', async () => {
    const signals = new EventEmitter();
    const saves: Array<CheckpointState<number>> = [];
    const started: number[] = [];
    const summary = await runTasks(
      Array.from({ length: 50 }, (_, i) => i),
      async (n) => {
        started.push(n);
        if (n === 2) signals.emit('SIGINT');
        await sleep(1);
      },
      {
        concurrency: 2,
        signals,
        checkpoint: { save: (state) => void saves.push(state) },
      },
    );
    expect(summary.interrupted).toBe(true);
    expect(started.length).toBeLessThan(50);
    expect(saves.at(-1)?.done).toBe(started.length);
    expect(signals.listenerCount('SIGINT')).toBe(0);
    expect(signals.listenerCount('SIGTERM')).toBe(0);
  });

  it('handles iterables with an explicit total', async () => {
    function* tasks() {
      yield 'a';
      yield 'b';
    }
    const summary = await runTasks(tasks(), async (task) => task, {
      concurrency: 4,
      total: 2,
      signals: false,
    });
    expect(summary).toMatchObject({ done: 2, total: 2 });
  });
});

describe('formatProgress', () => {
  it('renders done/total, rate and eta', () => {
    expect(
      formatProgress({
        done: 50,
        total: 200,
        failed: 2,
        elapsedMs: 10_000,
        ratePerSecond: 5,
        etaSeconds: 30,
      }),
    ).toBe('50/200 5.0/s eta 30s 2 failed');
  });
});
