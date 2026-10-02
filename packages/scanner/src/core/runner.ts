export type Progress = {
  done: number;
  failed: number;
  total: number | null;
  elapsedMs: number;
  ratePerSecond: number;
  etaSeconds: number | null;
};

export type TaskFailure<TTask> = { task: TTask; index: number; error: unknown };

export type CheckpointState<TTask> = Progress & { failures: ReadonlyArray<TaskFailure<TTask>> };

export type SignalSource = {
  on(event: NodeJS.Signals, listener: () => void): unknown;
  off(event: NodeJS.Signals, listener: () => void): unknown;
};

export type RunOptions<TTask, TResult> = {
  concurrency: number;
  total?: number;
  onResult?: (result: TResult, task: TTask, index: number) => void | Promise<void>;
  onProgress?: (progress: Progress) => void;
  progressEveryMs?: number;
  checkpoint?: {
    every?: number;
    save: (state: CheckpointState<TTask>) => void | Promise<void>;
  };
  signals?: SignalSource | false;
  now?: () => number;
};

export type RunSummary<TTask> = Progress & {
  failures: TaskFailure<TTask>[];
  interrupted: boolean;
};

export const DEFAULT_PROGRESS_MS = 5_000;
export const DEFAULT_CHECKPOINT_MS = 30_000;
const STOP_SIGNALS: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];

export const formatProgress = ({ done, total, failed, ratePerSecond, etaSeconds }: Progress) =>
  [
    `${done}/${total ?? '?'}`,
    `${ratePerSecond.toFixed(1)}/s`,
    `eta ${etaSeconds === null ? '?' : `${Math.ceil(etaSeconds)}s`}`,
    failed > 0 ? `${failed} failed` : null,
  ]
    .filter(Boolean)
    .join(' ');

export const runTasks = async <TTask, TResult>(
  tasks: Iterable<TTask>,
  worker: (task: TTask, index: number) => Promise<TResult>,
  options: RunOptions<TTask, TResult>,
): Promise<RunSummary<TTask>> => {
  const now = options.now ?? Date.now;
  const started = now();
  const total = options.total ?? (Array.isArray(tasks) ? tasks.length : null);
  const iterator = tasks[Symbol.iterator]();
  const failures: TaskFailure<TTask>[] = [];
  let done = 0;
  let nextIndex = 0;
  let stopping = false;
  let interrupted = false;

  const progress = (): Progress => {
    const elapsedMs = Math.max(1, now() - started);
    const ratePerSecond = (done * 1000) / elapsedMs;
    const remaining = total === null ? null : Math.max(0, total - done);
    return {
      done,
      failed: failures.length,
      total,
      elapsedMs,
      ratePerSecond,
      etaSeconds: remaining === null || ratePerSecond === 0 ? null : remaining / ratePerSecond,
    };
  };

  let saving: Promise<void> = Promise.resolve();
  const saveCheckpoint = (): Promise<void> => {
    const checkpoint = options.checkpoint;
    if (!checkpoint) return saving;
    saving = saving
      .then(() => checkpoint.save({ ...progress(), failures }))
      .catch((error: unknown) => {
        process.stderr.write(`checkpoint save failed: ${String(error)}\n`);
      });
    return saving;
  };

  const timers: NodeJS.Timeout[] = [];
  if (options.onProgress) {
    const report = options.onProgress;
    timers.push(
      setInterval(() => report(progress()), options.progressEveryMs ?? DEFAULT_PROGRESS_MS),
    );
  }
  if (options.checkpoint) {
    timers.push(
      setInterval(() => void saveCheckpoint(), options.checkpoint.every ?? DEFAULT_CHECKPOINT_MS),
    );
  }
  for (const timer of timers) timer.unref();

  const signals = options.signals === false ? null : (options.signals ?? process);
  let signalCount = 0;
  const onSignal = () => {
    signalCount += 1;
    if (signalCount > 1) process.exit(130);
    stopping = true;
    interrupted = true;
  };
  for (const signal of STOP_SIGNALS) signals?.on(signal, onSignal);

  const take = (): { task: TTask; index: number } | null => {
    if (stopping) return null;
    const next = iterator.next();
    if (next.done) return null;
    return { task: next.value, index: nextIndex++ };
  };

  const lane = async () => {
    for (let item = take(); item; item = take()) {
      try {
        const result = await worker(item.task, item.index);
        await options.onResult?.(result, item.task, item.index);
      } catch (error) {
        failures.push({ task: item.task, index: item.index, error });
      }
      done += 1;
    }
  };

  try {
    await Promise.all(Array.from({ length: Math.max(1, options.concurrency) }, lane));
  } finally {
    for (const timer of timers) clearInterval(timer);
    for (const signal of STOP_SIGNALS) signals?.off(signal, onSignal);
  }
  await saveCheckpoint();
  options.onProgress?.(progress());
  return { ...progress(), failures, interrupted };
};
