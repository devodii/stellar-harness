import type { AppError, ContractsSummary, ScfProject, Snapshot } from '../../schema';
import type { ExpertContract } from '../../stellar/contracts';
import { enumerateContracts } from './enumerate';
import {
  archivedExportRows,
  archivedMeaningfulExportRows,
  type ContractExportRow,
  expiring30dExportRows,
  type ScfExportRow,
  scfFundedExportRows,
} from './export';
import { toContractRows } from './families';
import {
  codeFindings,
  fetchValidationStatuses,
  instanceFindings,
  unverifiedFindings,
} from './fingerprints';
import type { Checkpoint, Emit, Fetcher, RpcPort, Run, WriteDerived } from './ports';
import { applyScf, buildScfIndex, fetchScfProjects, fetchStellarlightRepos } from './scf';
import type { ContractRow } from './schemas';
import { contractsSummary } from './summary';
import { collectTtl, type TtlStats } from './ttl';

export const CONTRACT_ROWS_DERIVED = 'contract_rows';
export const SCF_PROJECTS_DERIVED = 'scf_projects';

export type ContractsCensusDeps = {
  fetch: Fetcher;
  rpc: RpcPort;
  run: Run;
  emit: Emit;
  writeDerived: WriteDerived;
  checkpoint: Checkpoint;
  snapshot: Snapshot;
  stellarExpertUrl: string;
  stellarlightUrl: string;
  ecosystemDirectory?: boolean;
  rpcConcurrency?: number;
  expertConcurrency?: number;
};

export type ContractsCensusOptions = {
  limit?: number;
  cursor?: string;
  previousRecords?: ExpertContract[];
  previousActivity?: Map<string, number>;
};

export type ContractsCensusResult = {
  rows: ContractRow[];
  scfProjects: ScfProject[];
  summary: ContractsSummary;
  exports: {
    archived: ContractExportRow[];
    archivedMeaningful: ContractExportRow[];
    expiring30d: ContractExportRow[];
    scfFunded: ScfExportRow[];
  };
  stats: {
    enumerated: number;
    pages: number;
    invalidRecords: number;
    enumerationComplete: boolean;
    ttl: TtlStats;
    validationChecks: number;
    validationFailures: number;
    scfProjectPages: number;
    scfRepoPages: number;
    findings: number;
  };
  gaps: { source: string; error: AppError }[];
  notes: string[];
};

export const SCF_SKIP_NOTE =
  'Skipped the SCF join (stellarlight projects and repos): the ecosystem directory is mainnet only.';

const NO_SCF_SOURCE = { rows: [], pages: 0, gap: null };

export const runContractsCensus = async (
  deps: ContractsCensusDeps,
  options: ContractsCensusOptions = {},
): Promise<ContractsCensusResult> => {
  const gaps: ContractsCensusResult['gaps'] = [];
  const { snapshotLedger, ledgerCloseSeconds } = deps.snapshot;

  const enumeration = await enumerateContracts(deps, {
    limit: options.limit,
    cursor: options.cursor,
  });
  if (enumeration.gap) gaps.push({ source: 'stellar.expert:contracts', error: enumeration.gap });
  const records = [...(options.previousRecords ?? []), ...enumeration.records];

  const ttl = await collectTtl(
    { rpc: deps.rpc, run: deps.run, concurrency: deps.rpcConcurrency },
    toContractRows(records),
    { snapshotLedger, ledgerCloseSeconds },
  );

  const withScf = deps.ecosystemDirectory !== false;
  const notes = withScf ? [] : [SCF_SKIP_NOTE];
  const projects = withScf
    ? await fetchScfProjects(deps.fetch, deps.stellarlightUrl)
    : NO_SCF_SOURCE;
  const repos = withScf
    ? await fetchStellarlightRepos(deps.fetch, deps.stellarlightUrl)
    : NO_SCF_SOURCE;
  if (projects.gap) gaps.push({ source: 'stellarlight:projects', error: projects.gap });
  if (repos.gap) gaps.push({ source: 'stellarlight:repos', error: repos.gap });
  const scf = buildScfIndex(projects.rows, repos.rows);
  const rows = applyScf(ttl.rows, scf);
  await deps.writeDerived(CONTRACT_ROWS_DERIVED, rows);
  await deps.writeDerived(SCF_PROJECTS_DERIVED, scf.projects);

  const validation = await fetchValidationStatuses(
    {
      fetch: deps.fetch,
      stellarExpertUrl: deps.stellarExpertUrl,
      run: deps.run,
      concurrency: deps.expertConcurrency,
    },
    rows,
  );
  const findings = [
    ...instanceFindings(rows, { snapshotLedger, previousActivity: options.previousActivity }),
    ...codeFindings(rows, snapshotLedger),
    ...unverifiedFindings(rows, validation.statuses, snapshotLedger),
  ];
  for (const finding of findings) await deps.emit(finding);
  await deps.checkpoint({ cursor: enumeration.cursor, enumerated: records.length, done: true });

  return {
    rows,
    scfProjects: scf.projects,
    summary: contractsSummary(rows, scf.projects, options.previousActivity),
    exports: {
      archived: archivedExportRows(rows),
      archivedMeaningful: archivedMeaningfulExportRows(rows),
      expiring30d: expiring30dExportRows(rows),
      scfFunded: scfFundedExportRows(rows),
    },
    stats: {
      enumerated: records.length,
      pages: enumeration.pages,
      invalidRecords: enumeration.invalid,
      enumerationComplete: enumeration.complete,
      ttl: ttl.stats,
      validationChecks: validation.statuses.size + validation.failures,
      validationFailures: validation.failures,
      scfProjectPages: projects.pages,
      scfRepoPages: repos.pages,
      findings: findings.length,
    },
    gaps,
    notes,
  };
};
