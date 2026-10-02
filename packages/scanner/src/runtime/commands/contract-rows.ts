import {
  CONTRACT_EXPORT_COLUMNS,
  CONTRACT_EXPORT_FILES,
  type ContractExportRow,
} from '../../census/contracts/export';
import { CONTRACT_ROWS_DERIVED } from '../../census/contracts/index';
import { ContractRow } from '../../census/contracts/schemas';
import { writeExport } from '../artifacts';
import type { ScanContext } from '../context';
import type { ScanPersistence } from '../persistence';

export const exportName = (file: string) => file.replace(/\.csv$/, '');

export const readContractRows = async (
  ctx: Pick<ScanContext, 'readDerived'>,
): Promise<ContractRow[]> => {
  const rows: ContractRow[] = [];
  for await (const line of ctx.readDerived(CONTRACT_ROWS_DERIVED)) {
    rows.push(ContractRow.parse(line));
  }
  return rows;
};

export const writeArchivedMeaningfulExport = (
  persistence: ScanPersistence,
  rows: readonly ContractExportRow[],
) =>
  writeExport(
    persistence,
    exportName(CONTRACT_EXPORT_FILES.archivedMeaningful),
    rows,
    CONTRACT_EXPORT_COLUMNS,
  );
