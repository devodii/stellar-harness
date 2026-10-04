'use client';

import type { ReportView } from '@/lib/report-view';
import { count, ReportDataTable, Section, TextLink } from './section';

export function AnchorsSection({ anchors }: { anchors: ReportView['anchors'] }) {
  return (
    <Section id="anchors" title="Anchors">
      <ReportDataTable
        data={anchors.funnel}
        getRowId={(row) => row.step}
        columns={[
          { accessorKey: 'step', header: 'stage', enableSorting: false },
          {
            accessorKey: 'passed',
            header: 'passed',
            enableSorting: false,
            cell: ({ row }) => count(row.original.passed),
          },
          {
            accessorKey: 'failed',
            header: 'failed',
            enableSorting: false,
            cell: ({ row }) => count(row.original.failed),
          },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Failing domains</h3>
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
