import type { Checkpoint, Emit, FindingDraft, Run, WriteDerived } from './ports';

export const sequentialRun: Run = async (tasks, worker) => {
  const results = [];
  const failures = [];
  for (const task of tasks) {
    try {
      results.push(await worker(task));
    } catch (error) {
      failures.push({ task, error });
    }
  }
  return { results, failures };
};

export const memorySinks = () => {
  const findings: FindingDraft[] = [];
  const derived: Record<string, unknown[]> = {};
  const checkpoints: Record<string, unknown>[] = [];
  const emit: Emit = (draft) => {
    findings.push(draft);
  };
  const writeDerived: WriteDerived = (name, rows) => {
    derived[name] = [...(derived[name] ?? []), ...rows];
  };
  const checkpoint: Checkpoint = (state) => {
    checkpoints.push(state);
  };
  return { findings, derived, checkpoints, emit, writeDerived, checkpoint };
};
