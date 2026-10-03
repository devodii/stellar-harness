import { ExplorerLink } from '@/components/explorer-link';
import { ReportTable } from '@/components/report-table';
import { formatDecimal } from '@/lib/format';
import type { Report } from '@/lib/report-model';
import { count, Section, xlm } from './section';

export function RentSection({ report }: { report: Report }) {
  const { rent } = report.summary;
  const rows = report.csv['rent_top100.csv'].slice(0, 20);
  return (
    <Section id="rent" title="Rent">
      <ReportTable
        rows={rows}
        rowKey={(row) => row.contract ?? ''}
        columns={[
          {
            header: 'contract',
            cell: (row) => <ExplorerLink kind="contract" id={row.contract ?? ''} />,
          },
          { header: '12-month rent', align: 'right', cell: (row) => xlm(Number(row.xlm12m)) },
          {
            header: 'usd',
            align: 'right',
            cell: (row) => `$${formatDecimal(Number(row.usd12m), 2)}`,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Total {xlm(rent.totalXlm12m)} and median {xlm(rent.medianXlm12m)} across{' '}
        {count(rent.contractsEstimated)} sampled live contracts.
        {rent.xlmUsd &&
          ` USD at ${rent.xlmUsd.price} XLM/USD from ${rent.xlmUsd.source} at ${rent.xlmUsd.at}.`}
      </p>
    </Section>
  );
}
