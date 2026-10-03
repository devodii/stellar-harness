import { ExplorerLink } from '@/components/explorer-link';
import { ReportTable } from '@/components/report-table';
import type { CsvRow } from '@/lib/csv';
import type { Report } from '@/lib/report-model';
import { fixFor } from '@/lib/report-fixes';
import { count, percent, Section, TextLink } from './section';

type AccountFailures = {
  account: string;
  failures: number;
  code: string;
  classification: string;
  domain: string;
};

const codeOf = (clusterType: string): string => clusterType.replace(/_CLUSTER$/, '').toLowerCase();

const classify = (tags: string[]): string => {
  if (tags.includes('anchor_distribution')) return 'anchor distribution';
  if (tags.includes('channel_pattern')) return 'channel pattern';
  if (tags.includes('multisig')) return 'multisig';
  return 'single account';
};

const topAccounts = (clusters: CsvRow[], limit = 25): AccountFailures[] => {
  const byAccount = new Map<string, CsvRow[]>();
  for (const row of clusters)
    byAccount.set(row.account ?? '', [...(byAccount.get(row.account ?? '') ?? []), row]);
  return [...byAccount.entries()]
    .map(([account, rows]) => {
      const dominant = rows.reduce((top, row) =>
        Number(row.count) > Number(top.count) ? row : top,
      );
      const tags = rows.flatMap((row) => (row.tags ?? '').split(';'));
      return {
        account,
        failures: rows.reduce((sum, row) => sum + Number(row.count), 0),
        code: codeOf(dominant.type ?? ''),
        classification: classify(tags),
        domain: dominant.home_domain ?? '',
      };
    })
    .sort((a, b) => b.failures - a.failures)
    .slice(0, limit);
};

export function FailuresSection({ report }: { report: Report }) {
  const { failures } = report.summary;
  const byCode = [...report.csv['failed_tx_by_code.csv']].sort(
    (a, b) => Number(b.count) - Number(a.count),
  );
  const params = report.runs.failures?.method.parameters ?? {};
  return (
    <Section id="failures" title="Failed transactions">
      <ReportTable
        rows={byCode}
        rowKey={(row) => row.code ?? ''}
        columns={[
          { header: 'code', cell: (row) => row.code },
          { header: 'count', align: 'right', cell: (row) => count(Number(row.count)) },
          {
            header: 'share',
            align: 'right',
            cell: (row) => percent(Number(row.count), failures.txFailed),
          },
          { header: 'preventable', cell: (row) => row.preventable },
          { header: 'fix', wrap: true, cell: (row) => fixFor(row.code ?? '') },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Top 25 source accounts by preventable failures</h3>
      <ReportTable
        rows={topAccounts(report.csv['failure_clusters.csv'])}
        rowKey={(row) => row.account}
        columns={[
          { header: 'account', cell: (row) => <ExplorerLink kind="account" id={row.account} /> },
          { header: 'failures', align: 'right', cell: (row) => count(row.failures) },
          { header: 'dominant code', cell: (row) => row.code },
          {
            header: 'classification',
            cell: (row) =>
              row.classification === 'anchor distribution' && row.domain ? (
                <>
                  anchor distribution,{' '}
                  <TextLink href={`https://${row.domain}/.well-known/stellar.toml`}>
                    {row.domain}
                  </TextLink>
                </>
              ) : (
                row.classification
              ),
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Window {failures.windowStart} to {failures.windowEnd}, ledgers{' '}
        {params['start ledger'] ? (
          <ExplorerLink kind="ledger" id={String(params['start ledger'])} />
        ) : (
          '?'
        )}{' '}
        to{' '}
        {params['end ledger'] ? (
          <ExplorerLink kind="ledger" id={String(params['end ledger'])} />
        ) : (
          '?'
        )}
        . Result codes come from each transaction&apos;s result_xdr returned by RPC getTransactions,
        decoded with Horizon&apos;s code names; Horizon list records carry result_xdr rather than
        extras.result_codes.
      </p>
    </Section>
  );
}
