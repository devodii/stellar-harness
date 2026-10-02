import type { FindingType, Severity, SubjectKind } from '@harness/schema';

export type {
  DecodeEnvelopeSummary,
  DecodeResultCodes,
  HorizonAccount,
  HorizonPort,
  RpcPort,
  RpcTransaction,
} from '@harness/stellar-tools';

export type FindingDraft = {
  type: FindingType;
  subjectKind: SubjectKind;
  subject: string;
  severity: Severity;
  evidence: Record<string, unknown>;
  tags: string[];
};

export type Emit = (draft: FindingDraft) => void | Promise<void>;

export type WriteDerived = (name: string, rows: unknown[]) => Promise<void>;

export type Checkpoint<TState> = (state: TState) => Promise<void>;

export type RunOptions = { concurrency: number; label: string };

export type RunOutcome<T, R> = {
  results: R[];
  failures: { task: T; error: unknown }[];
};

export type Runner = <T, R>(
  tasks: T[],
  worker: (task: T) => Promise<R>,
  opts: RunOptions,
) => Promise<RunOutcome<T, R>>;
