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
          {
            accessorKey: 'sha256',
            header: 'sha256',
            enableSorting: false,
            cell: ({ row }) => (
              <span className="block min-w-64 break-all whitespace-normal">
                {row.original.sha256}
              </span>
            ),
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Check a download with <span className="font-mono">shasum -a 256 &lt;file&gt;</span>.
        {files[0] && ` Published ${files[0].publishedAt.slice(0, 16).replace('T', ' ')} UTC.`}
      </p>
    </Section>
  );
}
