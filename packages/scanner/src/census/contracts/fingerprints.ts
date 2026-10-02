import type { FindingType, Severity } from '../../schema';
import { fetchExpertContract } from '../../stellar/contracts';
import type { Fetcher, FindingDraft, Run } from './ports';
import { scfTags } from './scf';
import type { ContractRow } from './schemas';

export const UNVERIFIED_MIN_INVOCATIONS = 100;
export const EXPERT_CONCURRENCY = 4;
export const CODE_ARCHIVED_SAMPLE = 10;

export const SEVERITY: Record<
  Extract<
    FindingType,
    | 'CONTRACT_INSTANCE_ARCHIVED'
    | 'CONTRACT_CODE_ARCHIVED'
    | 'CONTRACT_INSTANCE_EXPIRING_30D'
    | 'CONTRACT_INSTANCE_EXPIRING_90D'
    | 'CONTRACT_LIVE_IDLE'
    | 'CONTRACT_UNVERIFIED_SOURCE'
  >,
  Severity
> = {
  CONTRACT_INSTANCE_ARCHIVED: 'critical',
  CONTRACT_CODE_ARCHIVED: 'critical',
  CONTRACT_INSTANCE_EXPIRING_30D: 'high',
  CONTRACT_INSTANCE_EXPIRING_90D: 'medium',
  CONTRACT_LIVE_IDLE: 'info',
  CONTRACT_UNVERIFIED_SOURCE: 'low',
};

type ContractFindingType = keyof typeof SEVERITY;

export const activityOf = (row: ContractRow): number => row.invocations + row.subinvocations;

export const isLiveIdle = (row: ContractRow, previousActivity?: Map<string, number>): boolean => {
  if (!row.instance || row.instance.archived) return false;
  const previous = previousActivity?.get(row.contract);
  return previous === undefined ? activityOf(row) === 0 : activityOf(row) === previous;
};

const contractTags = (row: ContractRow): string[] => ['contract', ...scfTags(row.scf)];

const draft = (
  type: ContractFindingType,
  subject: string,
  evidence: Record<string, unknown>,
  tags: string[],
): FindingDraft => ({
  type,
  subjectKind: 'contract',
  subject,
  severity: SEVERITY[type],
  evidence,
  tags,
});

const baseEvidence = (row: ContractRow, snapshotLedger: number) => ({
  wasm: row.wasm,
  familySize: row.familySize,
  created: new Date(row.created * 1000).toISOString(),
  invocations: row.invocations,
  subinvocations: row.subinvocations,
  snapshotLedger,
  scfSlug: row.scf?.slug ?? null,
});

export const instanceFindings = (
  rows: ContractRow[],
  context: { snapshotLedger: number; previousActivity?: Map<string, number> },
): FindingDraft[] =>
  rows.flatMap((row) => {
    const instance = row.instance;
    if (!instance) return [];
    const evidence = {
      ...baseEvidence(row, context.snapshotLedger),
      present: instance.present,
      liveUntilLedgerSeq: instance.liveUntilLedgerSeq,
      ledgersLeft: instance.ledgersLeft,
      daysLeft: instance.daysLeft,
    };
    const tags = contractTags(row);
    const findings: FindingDraft[] = [];
    if (instance.archived) {
      findings.push(draft('CONTRACT_INSTANCE_ARCHIVED', row.contract, evidence, tags));
    }
    if (instance.expiring30d) {
      findings.push(draft('CONTRACT_INSTANCE_EXPIRING_30D', row.contract, evidence, tags));
    }
    if (instance.expiring90d) {
      findings.push(draft('CONTRACT_INSTANCE_EXPIRING_90D', row.contract, evidence, tags));
    }
    if (isLiveIdle(row, context.previousActivity)) {
      const basis = context.previousActivity?.has(row.contract)
        ? 'unchanged_since_previous_run'
        : 'no_invocations';
      findings.push(draft('CONTRACT_LIVE_IDLE', row.contract, { ...evidence, basis }, tags));
    }
    return findings;
  });

export const codeFindings = (rows: ContractRow[], snapshotLedger: number): FindingDraft[] => {
  const families = new Map<string, ContractRow[]>();
  for (const row of rows) {
    if (row.wasm && row.code?.archived) {
      families.set(row.wasm, [...(families.get(row.wasm) ?? []), row]);
    }
  }
  return [...families.entries()].map(([wasm, members]) => {
    const code = members[0]?.code;
    const tags = [
      ...new Set(['contract', 'contract_code', ...members.flatMap((m) => scfTags(m.scf))]),
    ];
    return draft(
      'CONTRACT_CODE_ARCHIVED',
      wasm,
      {
        wasm,
        present: code?.present ?? false,
        liveUntilLedgerSeq: code?.liveUntilLedgerSeq ?? null,
        snapshotLedger,
        familySize: members[0]?.familySize ?? members.length,
        liveInstances: members.filter((m) => m.instance && !m.instance.archived).length,
        contracts: members.slice(0, CODE_ARCHIVED_SAMPLE).map((m) => m.contract),
      },
      tags,
    );
  });
};

export const unverifiedCandidates = (rows: ContractRow[]): ContractRow[] =>
  rows.filter((row) => row.wasm && row.invocations > UNVERIFIED_MIN_INVOCATIONS);

export const fetchValidationStatuses = async (
  deps: { fetch: Fetcher; stellarExpertUrl: string; run: Run; concurrency?: number },
  rows: ContractRow[],
): Promise<{ statuses: Map<string, string>; failures: number }> => {
  const outcome = await deps.run(
    unverifiedCandidates(rows),
    async (row) => {
      const detail = await fetchExpertContract(deps.fetch, deps.stellarExpertUrl, row.contract);
      if (!detail.ok) throw detail.error;
      return [row.contract, detail.value?.validation?.status ?? 'none'] as const;
    },
    { concurrency: deps.concurrency ?? EXPERT_CONCURRENCY, label: 'contracts:validation' },
  );
  return { statuses: new Map(outcome.results), failures: outcome.failures.length };
};

export const unverifiedFindings = (
  rows: ContractRow[],
  statuses: Map<string, string>,
  snapshotLedger: number,
): FindingDraft[] =>
  unverifiedCandidates(rows).flatMap((row) => {
    const status = statuses.get(row.contract);
    if (status === undefined || status === 'verified') return [];
    return [
      draft(
        'CONTRACT_UNVERIFIED_SOURCE',
        row.contract,
        { ...baseEvidence(row, snapshotLedger), validationStatus: status },
        contractTags(row),
      ),
    ];
  });
