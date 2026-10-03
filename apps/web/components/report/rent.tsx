'use client';

import { ExplorerLink } from '@/components/explorer-link';
import { formatDecimal } from '@/lib/format';
import type { ReportView } from '@/lib/report-view';
import { ReportDataTable, Section, xlm } from './section';

export function RentSection({ rent }: { rent: ReportView['rent'] }) {
  return (
    <Section id="rent" title="Rent">
      <ReportDataTable
        data={rent.top}
        getRowId={(row) => row.contract}
        columns={[
          {
            accessorKey: 'contract',
            header: 'contract',
            enableSorting: false,
            cell: ({ row }) => <ExplorerLink kind="contract" id={row.original.contract} />,
          },
          { accessorKey: 'xlm', header: '12-month rent', cell: ({ row }) => xlm(row.original.xlm) },
          {
            accessorKey: 'usd',
            header: 'usd',
            cell: ({ row }) => `$${formatDecimal(row.original.usd, 2)}`,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">{rent.note}</p>
    </Section>
  );
}
