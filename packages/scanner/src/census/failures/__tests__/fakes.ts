import type { Runner } from '../ports';

export const sequentialRunner: Runner = async (tasks, worker) => {
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
