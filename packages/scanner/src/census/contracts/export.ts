import type { ContractRow } from './schemas';
import { isArchivedMeaningful } from './summary';

export const CONTRACT_EXPORT_COLUMNS = [
  'contract',
  'wasm',
  'family_size',
  'created',
  'invocations',
  'live_until_ledger',
  'days_left',
  'scf_slug',
  'scf_round',
] as const;

export const SCF_EXPORT_COLUMNS = [...CONTRACT_EXPORT_COLUMNS, 'scf_name', 'status'] as const;

export const CONTRACT_EXPORT_FILES = {
  archived: 'contracts_archived.csv',
  archivedMeaningful: 'contracts_archived_meaningful.csv',
  expiring30d: 'contracts_expiring_30d.csv',
  scfFunded: 'contracts_scf_funded.csv',
} as const;

type Cell = string | number | null;
export type ContractExportRow = Record<(typeof CONTRACT_EXPORT_COLUMNS)[number], Cell>;
export type ScfExportRow = Record<(typeof SCF_EXPORT_COLUMNS)[number], Cell>;

export type ContractStatus = 'archived' | 'expiring_30d' | 'expiring_90d' | 'live' | 'unknown';

export const contractStatus = (row: ContractRow): ContractStatus => {
  if (!row.instance) return 'unknown';
  if (row.instance.archived) return 'archived';
  if (row.instance.expiring30d) return 'expiring_30d';
  if (row.instance.expiring90d) return 'expiring_90d';
  return 'live';
};

export const toExportRow = (row: ContractRow): ContractExportRow => ({
  contract: row.contract,
  wasm: row.wasm,
  family_size: row.familySize,
  created: new Date(row.created * 1000).toISOString(),
  invocations: row.invocations,
  live_until_ledger: row.instance?.liveUntilLedgerSeq ?? null,
  days_left: row.instance?.daysLeft ?? null,
  scf_slug: row.scf?.slug ?? null,
  scf_round: row.scf?.round ?? null,
});

const byInvocationsDesc = (a: ContractRow, b: ContractRow) =>
  b.invocations - a.invocations || a.contract.localeCompare(b.contract);

const byDaysLeftAsc = (a: ContractRow, b: ContractRow) =>
  (a.instance?.daysLeft ?? 0) - (b.instance?.daysLeft ?? 0) || a.contract.localeCompare(b.contract);

export const archivedExportRows = (rows: ContractRow[]): ContractExportRow[] =>
  rows
    .filter((row) => row.instance?.archived)
    .sort(byInvocationsDesc)
    .map(toExportRow);

export const archivedMeaningfulExportRows = (rows: ContractRow[]): ContractExportRow[] =>
  rows.filter(isArchivedMeaningful).sort(byInvocationsDesc).map(toExportRow);

export const expiring30dExportRows = (rows: ContractRow[]): ContractExportRow[] =>
  rows
    .filter((row) => row.instance?.expiring30d)
    .sort(byDaysLeftAsc)
    .map(toExportRow);

export const scfFundedExportRows = (rows: ContractRow[]): ScfExportRow[] =>
  rows
    .filter((row) => row.scf)
    .sort((a, b) => (a.scf?.slug ?? '').localeCompare(b.scf?.slug ?? '') || byInvocationsDesc(a, b))
    .map((row) => ({
      ...toExportRow(row),
      scf_name: row.scf?.name ?? null,
      status: contractStatus(row),
    }));
