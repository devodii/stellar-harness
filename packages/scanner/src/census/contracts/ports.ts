import type { FindingType, Severity, SubjectKind } from '@harness/schema';

export type {
  Fetcher,
  HorizonPort,
  HttpRequest,
  HttpResponse,
  LedgerEntryResult,
  RpcPort,
} from '@harness/stellar-tools/contracts';

export type FindingDraft = {
  type: FindingType;
  subjectKind: SubjectKind;
  subject: string;
  severity: Severity;
  evidence: Record<string, unknown>;
  tags: string[];
};

export type Emit = (draft: FindingDraft) => Promise<void> | void;

export type WriteDerived = (name: string, rows: unknown[]) => Promise<void> | void;

export type Checkpoint = (state: Record<string, unknown>) => Promise<void> | void;

export type RunOutcome<T, R> = { results: R[]; failures: { task: T; error: unknown }[] };

export type Run = <T, R>(
  tasks: T[],
  worker: (task: T) => Promise<R>,
  opts: { concurrency: number; label: string },
) => Promise<RunOutcome<T, R>>;
