import { ExplorerLink } from '@/components/explorer-link';
import { type ReportColumn, ReportTable } from '@/components/report-table';
import type { CsvRow } from '@/lib/csv';
import { isActive, type Report } from '@/lib/report-model';
import { count, Section, TextLink } from './section';

const scfHref = (slug: string): string => `https://communityfund.stellar.org/project/${slug}`;

const firstContractByWasm = (rows: CsvRow[]): Map<string, string> => {
  const first = new Map<string, string>();
  for (const row of rows)
    if (row.wasm && !first.has(row.wasm)) first.set(row.wasm, row.contract ?? '');
  return first;
};

const baseColumns = (firstByWasm: Map<string, string>): ReportColumn<CsvRow>[] => [
  { header: 'contract', cell: (row) => <ExplorerLink kind="contract" id={row.contract ?? ''} /> },
  {
    header: 'wasm',
    cell: (row) =>
      row.wasm ? (
        <ExplorerLink
          kind="contract"
          id={firstByWasm.get(row.wasm) ?? row.contract ?? ''}
          label={`${row.wasm.slice(0, 8)}…`}
        />
      ) : (
        'stellar asset'
      ),
  },
  { header: 'invocations', align: 'right', cell: (row) => count(Number(row.invocations)) },
  { header: 'family size', align: 'right', cell: (row) => count(Number(row.family_size)) },
  {
    header: 'scf project',
    cell: (row) =>
      row.scf_slug ? <TextLink href={scfHref(row.scf_slug)}>{row.scf_slug}</TextLink> : '',
  },
];

const byInvocations = (a: CsvRow, b: CsvRow) => Number(b.invocations) - Number(a.invocations);

export function ContractsSection({ report }: { report: Report }) {
  const archived = [...report.csv['contracts_archived_meaningful.csv']].sort(byInvocations);
  const expiring = report.csv['contracts_expiring_30d.csv']
    .filter(isActive)
    .sort((a, b) => Number(a.days_left) - Number(b.days_left));
  const { contracts } = report.summary;
  return (
    <Section id="contracts" title="Contracts">
      <h3 className="text-sm font-medium">Archived, active ({count(archived.length)})</h3>
      <ReportTable
        rows={archived}
        rowKey={(row) => row.contract ?? ''}
        columns={baseColumns(firstContractByWasm(archived))}
      />
      <h3 className="pt-2 text-sm font-medium">
        Expiring within 30 days, active ({count(expiring.length)})
      </h3>
      <ReportTable
        rows={expiring}
        rowKey={(row) => row.contract ?? ''}
        columns={[
          ...baseColumns(firstContractByWasm(expiring)),
          { header: 'days left', align: 'right', cell: (row) => row.days_left },
          {
            header: 'live until',
            align: 'right',
            cell: (row) => <ExplorerLink kind="ledger" id={row.live_until_ledger ?? ''} />,
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Raw totals including mass-deployed families: {count(contracts.archivedInstances)} archived
        and {count(contracts.expiring30d)} expiring within 30 days, of {count(contracts.total)}{' '}
        contracts. The tables keep only active contracts (100 or more lifetime invocations, or
        SCF-funded), which removes families deployed in bulk and never called. The scanner has no
        labels for these contracts.
      </p>
    </Section>
  );
}
