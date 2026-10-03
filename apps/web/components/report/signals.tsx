'use client';

import type { ReportView } from '@/lib/report-view';
import { ReportDataTable, Section, TextLink, Wrap } from './section';

export function SignalsSection({ issues }: { issues: ReportView['issues'] }) {
  return (
    <Section id="signals" title="Ecosystem signals">
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          GitHub issues were not collected for this snapshot.
        </p>
      ) : (
        issues.map(({ category, rows }) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-medium">
              {category} ({rows.length})
            </h3>
            <ReportDataTable
              data={rows}
              getRowId={(row) => row.url}
              columns={[
                {
                  accessorKey: 'title',
                  header: 'issue',
                  cell: ({ row }) => (
                    <Wrap>
                      <TextLink href={row.original.url}>{row.original.title}</TextLink>
                    </Wrap>
                  ),
                },
                { accessorKey: 'repo', header: 'repo' },
                { accessorKey: 'state', header: 'state' },
                { accessorKey: 'opened', header: 'opened' },
              ]}
            />
          </div>
        ))
      )}
    </Section>
  );
}
