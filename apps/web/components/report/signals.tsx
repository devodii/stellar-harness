import { ReportTable } from '@/components/report-table';
import type { CsvRow } from '@/lib/csv';
import type { Report } from '@/lib/report-model';
import { Section, TextLink } from './section';

const groupBy = (rows: CsvRow[]): [string, CsvRow[]][] => {
  const groups = new Map<string, CsvRow[]>();
  for (const row of rows)
    groups.set(row.category ?? '', [...(groups.get(row.category ?? '') ?? []), row]);
  return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
};

export function SignalsSection({ report }: { report: Report }) {
  const issues = report.csv['github_issues.csv'];
  return (
    <Section id="signals" title="Ecosystem signals">
      {issues.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          GitHub issues were not collected for this snapshot.
        </p>
      ) : (
        groupBy(issues).map(([category, rows]) => (
          <div key={category} className="space-y-2">
            <h3 className="text-sm font-medium">
              {category} ({rows.length})
            </h3>
            <ReportTable
              rows={[...rows].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))}
              rowKey={(row) => row.url ?? ''}
              columns={[
                {
                  header: 'issue',
                  wrap: true,
                  cell: (row) => <TextLink href={row.url ?? ''}>{row.title}</TextLink>,
                },
                { header: 'repo', cell: (row) => row.repo },
                { header: 'state', cell: (row) => row.state },
                { header: 'opened', cell: (row) => (row.createdAt ?? '').slice(0, 10) },
              ]}
            />
          </div>
        ))
      )}
    </Section>
  );
}
