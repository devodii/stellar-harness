import type { ContractsSummary } from '@harness/schema';
import { archivedMeaningfulExportRows } from '../../census/contracts/export';
import { meaningfulCounts } from '../../census/contracts/summary';
import type { ScanContext } from '../context';
import { readContractRows, writeArchivedMeaningfulExport } from './contract-rows';

export const lacksMeaningfulCounts = (contracts: ContractsSummary): boolean =>
  contracts.archivedMeaningful === 0 &&
  contracts.expiring30dMeaningful === 0 &&
  (contracts.archivedInstances > 0 || contracts.expiring30d > 0);

export const backfillMeaningfulCounts = async (
  ctx: Pick<ScanContext, 'readDerived' | 'persistence' | 'log'>,
  contracts: ContractsSummary,
): Promise<ContractsSummary> => {
  if (!lacksMeaningfulCounts(contracts)) return contracts;
  const rows = await readContractRows(ctx);
  if (rows.length === 0) return contracts;
  const counts = meaningfulCounts(rows);
  await writeArchivedMeaningfulExport(ctx.persistence, archivedMeaningfulExportRows(rows));
  ctx.log(
    `[report] recomputed meaningful contract counts from ${rows.length} stored rows: ${counts.archivedMeaningful} archived, ${counts.expiring30dMeaningful} expiring within 30 days`,
  );
  return { ...contracts, ...counts };
};
