import type { FindingDraft } from '../../stellar/anchors';

export type {
  Fetcher,
  FindingDraft,
  HorizonAccount,
  HorizonPort,
  HttpRequest,
  HttpResponse,
} from '../../stellar/anchors';

export type RunTasks = <T, R>(
  tasks: T[],
  worker: (task: T) => Promise<R>,
  opts: { concurrency: number; label: string },
) => Promise<{ results: R[]; failures: { task: T; error: unknown }[] }>;

export type Emit = (draft: FindingDraft) => Promise<void> | void;

export type WriteDerived = (name: string, rows: unknown[]) => Promise<void>;

export type WriteJson = (relativePath: string, data: unknown) => Promise<void>;

export type Checkpoint<TState> = (state: TState) => Promise<void>;

export const sequentialRun: RunTasks = async (tasks, worker) => {
  const results: Awaited<ReturnType<typeof worker>>[] = [];
  const failures: { task: (typeof tasks)[number]; error: unknown }[] = [];
  for (const task of tasks) {
    try {
      results.push(await worker(task));
    } catch (error) {
      failures.push({ task, error });
    }
  }
  return { results, failures };
};
