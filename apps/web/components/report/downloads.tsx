'use client';

import type { ReportView } from '@/lib/report-view';
import { count, fileHref, ReportDataTable, Section, TextLink } from './section';

export function DownloadsSection({ files }: { files: ReportView['files'] }) {
  return (
    <Section id="downloads" title="Downloads">
      <ReportDataTable
        data={files}
        getRowId={(row) => row.name}
        columns={[
          {
            accessorKey: 'name',
            header: 'file',
            cell: ({ row }) => (
              <TextLink href={fileHref(row.original.name)}>{row.original.name}</TextLink>
            ),
          },
          {
            accessorKey: 'rowCount',
            header: 'rows',
            cell: ({ row }) => count(row.original.rowCount),
          },
        ]}
      />
    </Section>
  );
}
