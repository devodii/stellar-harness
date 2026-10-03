import { ReportTable } from '@/components/report-table';
import { formatDecimal } from '@/lib/format';
import type { Report } from '@/lib/report-model';
import { count, fileHref, Section, TextLink } from './section';

export function DownloadsSection({ report }: { report: Report }) {
  return (
    <Section id="downloads" title="Downloads">
      <ReportTable
        rows={report.files}
        rowKey={(row) => row.name}
        columns={[
          {
            header: 'file',
            cell: (row) => <TextLink href={fileHref(row.name)}>{row.name}</TextLink>,
          },
          { header: 'rows', align: 'right', cell: (row) => count(row.rowCount) },
          {
            header: 'sha256',
            wrap: true,
            cell: (row) => <span className="break-all">{row.sha256}</span>,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Check a download with <span className="font-mono">shasum -a 256 &lt;file&gt;</span>.
        Published {report.files[0]?.publishedAt.slice(0, 16).replace('T', ' ')} UTC
        {report.files.length > 0 &&
          `, ${formatDecimal(
            report.files.reduce((sum, file) => sum + file.rowCount, 0),
            0,
          )} rows in total`}
        .
      </p>
    </Section>
  );
}
