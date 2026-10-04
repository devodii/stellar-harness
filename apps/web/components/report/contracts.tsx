'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ExplorerLink } from '@/components/explorer-link';
import type { ContractRow, ReportView } from '@/lib/report-view';
import { count, ReportDataTable, Section, TextLink } from './section';

const scfHref = (slug: string): string => `https://communityfund.stellar.org/project/${slug}`;

const BASE_COLUMNS: ColumnDef<ContractRow>[] = [
  {
    accessorKey: 'contract',
    header: 'contract',
    enableSorting: false,
    cell: ({ row }) => <ExplorerLink kind="contract" id={row.original.contract} />,
  },
  {
    accessorKey: 'wasm',
    header: 'wasm',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.wasm ? (
        <ExplorerLink
          kind="contract"
          id={row.original.wasmContract}
          label={`${row.original.wasm.slice(0, 8)}…`}
        />
      ) : (
        'stellar asset'
      ),
  },
  {
    accessorKey: 'invocations',
    header: 'invocations',
    cell: ({ row }) => count(row.original.invocations),
  },
  {
    accessorKey: 'familySize',
    header: 'family size',
    cell: ({ row }) => count(row.original.familySize),
  },
  {
    accessorKey: 'scfSlug',
    header: 'scf project',
    cell: ({ row }) =>
      row.original.scfSlug ? (
        <TextLink href={scfHref(row.original.scfSlug)}>{row.original.scfSlug}</TextLink>
      ) : (
        ''
      ),
  },
];

const EXPIRING_COLUMNS: ColumnDef<ContractRow>[] = [
  ...BASE_COLUMNS,
  { accessorKey: 'daysLeft', header: 'days left' },
  {
    accessorKey: 'liveUntil',
    header: 'live until',
    enableSorting: false,
    cell: ({ row }) => <ExplorerLink kind="ledger" id={row.original.liveUntil} />,
  },
];

export function ContractsSection({ contracts }: { contracts: ReportView['contracts'] }) {
  return (
    <Section id="contracts" title="Contracts">
      <h3 className="text-sm font-medium">Archived, active ({count(contracts.archived.length)})</h3>
      <ReportDataTable
        data={contracts.archived}
        getRowId={(row) => row.contract}
        columns={BASE_COLUMNS}
      />
      <h3 className="pt-2 text-sm font-medium">
        Expiring within 30 days, active ({count(contracts.expiring.length)})
      </h3>
      <ReportDataTable
        data={contracts.expiring}
        getRowId={(row) => row.contract}
        columns={EXPIRING_COLUMNS}
      />
      <p className="text-xs text-muted-foreground">{contracts.note}</p>
    </Section>
  );
}
