import { ContractsSummary, type ScfProject } from '@harness/schema';
import { isLiveIdle } from './fingerprints';
import type { ContractRow } from './schemas';

export const STELLAR_ASSET_FAMILY = 'stellar_asset';

const countWhere = <T>(items: T[], predicate: (item: T) => boolean): number =>
  items.reduce((total, item) => (predicate(item) ? total + 1 : total), 0);

const isArchived = (row: ContractRow) => row.instance?.archived === true;
const isExpiring30d = (row: ContractRow) => row.instance?.expiring30d === true;

export const contractsSummary = (
  rows: ContractRow[],
  scfProjects: ScfProject[],
  previousActivity?: Map<string, number>,
): ContractsSummary => {
  const archivedByFamily: Record<string, number> = {};
  for (const row of rows.filter(isArchived)) {
    const family = row.wasm ?? STELLAR_ASSET_FAMILY;
    archivedByFamily[family] = (archivedByFamily[family] ?? 0) + 1;
  }
  const funded = rows.filter((row) => row.scf !== null);
  return ContractsSummary.parse({
    total: rows.length,
    families: new Set(rows.flatMap((row) => (row.wasm ? [row.wasm] : []))).size,
    archivedInstances: countWhere(rows, isArchived),
    archivedByFamily,
    expiring30d: countWhere(rows, isExpiring30d),
    expiring90d: countWhere(rows, (row) => row.instance?.expiring90d === true),
    liveIdle: countWhere(rows, (row) => isLiveIdle(row, previousActivity)),
    scfFunded: {
      total: funded.length,
      archived: countWhere(funded, isArchived),
      expiring30d: countWhere(funded, isExpiring30d),
      projects: scfProjects,
    },
  });
};
