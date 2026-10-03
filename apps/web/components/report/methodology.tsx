'use client';

import { Reproduce } from '@/components/reproduce';
import { formatDecimal } from '@/lib/format';
import { PREVENTABLE_FIXES } from '@/lib/report-fixes';
import type { ReportView } from '@/lib/report-view';
import { count, ReportDataTable, Section } from './section';

const LIMITATIONS = [
  'stellar.expert invocation counts are lifetime totals, so an active contract may be quiet today.',
  'A contract counts as archived when RPC does not return its instance or its liveUntilLedgerSeq is below the snapshot ledger.',
  'Anchor tests run only the read-only subset; tests that write customers, deposits, withdrawals or quotes on third-party servers, and all of SEP-31, are excluded.',
  'Rent is simulated for a seeded stratified sample of live contracts; totals are not weighted to the full population.',
  'stellar.expert has no page per wasm hash, so a wasm hash links to the first contract in its family.',
  'Transaction-level codes such as tx_bad_seq are rejected at submission and never reach ledger history, so they show up rarely or never.',
];

export function MethodologySection({ methods }: { methods: ReportView['methods'] }) {
  return (
    <Section id="methodology" title="Methodology">
      {methods.map(({ census, record }) => (
        <div key={census} id={`method-${census}`} className="scroll-mt-8 space-y-3">
          <h3 className="text-sm font-medium">{record.method.census}</h3>
          <Reproduce lines={record.method.endpoints} />
          <ReportDataTable
            data={Object.entries(record.method.parameters).map(([name, value]) => ({
              name,
              value: String(value),
            }))}
            getRowId={(row) => row.name}
            empty="No parameters recorded."
            columns={[
              { accessorKey: 'name', header: 'parameter', enableSorting: false },
              { accessorKey: 'value', header: 'value', enableSorting: false },
            ]}
          />
          <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {record.method.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
            <li>
              Measured: {formatDecimal(record.run.wallMs / 1000, 1)} s wall time,{' '}
              {count(record.run.requests)} requests, {count(record.run.networkCalls)} network calls,{' '}
              {count(record.run.gaps)} gaps.
            </li>
          </ul>
        </div>
      ))}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Preventable codes</h3>
        <p className="font-mono text-xs">{Object.keys(PREVENTABLE_FIXES).join(', ')}</p>
      </div>
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Known limitations</h3>
        <ul className="list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          {LIMITATIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
