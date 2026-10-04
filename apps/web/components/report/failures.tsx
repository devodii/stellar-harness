'use client';

import { ExplorerLink } from '@/components/explorer-link';
import type { ReportView } from '@/lib/report-view';
import { count, ReportDataTable, Section, TextLink, Wrap } from './section';

export function FailuresSection({ failures }: { failures: ReportView['failures'] }) {
  return (
    <Section id="failures" title="Failed transactions">
      <ReportDataTable
        data={failures.codes}
        getRowId={(row) => row.code}
        columns={[
          { accessorKey: 'code', header: 'code' },
          { accessorKey: 'count', header: 'count', cell: ({ row }) => count(row.original.count) },
          { accessorKey: 'share', header: 'share', enableSorting: false },
          { accessorKey: 'preventable', header: 'preventable' },
          {
            accessorKey: 'fix',
            header: 'fix',
            enableSorting: false,
            cell: ({ row }) => <Wrap>{row.original.fix}</Wrap>,
          },
        ]}
      />
      <h3 className="pt-2 text-sm font-medium">Top 25 source accounts by preventable failures</h3>
      <ReportDataTable
        data={failures.accounts}
        getRowId={(row) => row.account}
        columns={[
          {
            accessorKey: 'account',
            header: 'account',
            enableSorting: false,
            cell: ({ row }) => <ExplorerLink kind="account" id={row.original.account} />,
          },
          {
            accessorKey: 'failures',
            header: 'failures',
            cell: ({ row }) => count(row.original.failures),
          },
          { accessorKey: 'code', header: 'dominant code' },
          {
            accessorKey: 'classification',
            header: 'classification',
            cell: ({ row }) =>
              row.original.classification === 'anchor distribution' && row.original.domain ? (
                <>
                  anchor distribution,{' '}
                  <TextLink href={`https://${row.original.domain}/.well-known/stellar.toml`}>
                    {row.original.domain}
                  </TextLink>
                </>
              ) : (
                row.original.classification
              ),
          },
        ]}
      />
      <p className="text-xs text-muted-foreground">
        Window {failures.windowStart} to {failures.windowEnd}, ledgers{' '}
        {failures.startLedger ? <ExplorerLink kind="ledger" id={failures.startLedger} /> : '?'} to{' '}
        {failures.endLedger ? <ExplorerLink kind="ledger" id={failures.endLedger} /> : '?'}. Result
        codes come from each transaction&apos;s result_xdr returned by RPC getTransactions, decoded
        with Horizon&apos;s code names; Horizon list records carry result_xdr rather than
        extras.result_codes.
      </p>
    </Section>
  );
}
