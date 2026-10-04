'use client';

import type { ReportView } from '@/lib/report-view';
import { count, ReportDataTable, Section, TextLink } from './section';

export function AnchorsSection({ anchors }: { anchors: ReportView['anchors'] }) {
  return (
    <Section id="anchors" title="Anchors">
      <ReportDataTable
        data={anchors.funnel}
        getRowId={(row) => row.stage}
        columns={[
          { accessorKey: 'stage', header: 'stage', enableSorting: false },
          {
            accessorKey: 'reached',
            header: 'reached',
            enableSorting: false,
            cell: ({ row }) => count(row.original.reached),
          },
          {
            accessorKey: 'passed',
            header: 'passed',
            enableSorting: false,
            cell: ({ row }) => count(row.original.passed),
          },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Domains by first failing stage</h3>
      <ReportDataTable
        data={anchors.failing}
        getRowId={(row) => row.domain}
        columns={[
          {
            accessorKey: 'domain',
            header: 'domain',
            cell: ({ row }) => (
              <TextLink href={row.original.tomlUrl}>{row.original.domain}</TextLink>
            ),
          },
          { accessorKey: 'country', header: 'country' },
          { accessorKey: 'region', header: 'region' },
          { accessorKey: 'stage', header: 'first failing stage' },
          { accessorKey: 'scfRound', header: 'scf round' },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Pass rate per SEP</h3>
      <ReportDataTable
        data={anchors.perSep}
        getRowId={(row) => row.check}
        columns={[
          { accessorKey: 'check', header: 'check' },
          { accessorKey: 'tested', header: 'tested' },
          { accessorKey: 'passed', header: 'passed' },
          { accessorKey: 'rate', header: 'rate', enableSorting: false },
        ]}
      />
    </Section>
  );
}
