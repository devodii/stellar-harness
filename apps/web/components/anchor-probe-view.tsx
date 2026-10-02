'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { DataTable } from '@/components/data-table';
import { KeyValueList } from '@/components/key-value-list';
import { ResultCard } from '@/components/result-card';
import { SeverityTag } from '@/components/severity-tag';
import { StatLabel } from '@/components/stat';
import { formatInt } from '@/lib/format';
import { TONE_TEXT } from '@/lib/tone';
import type { AnchorProbeView as AnchorProbeData, ProbeStageView } from '@/lib/tool-views';

const stageColumns: ColumnDef<ProbeStageView>[] = [
  { accessorKey: 'stage', header: 'stage', size: 90 },
  {
    accessorKey: 'ok',
    header: 'result',
    size: 70,
    cell: ({ row }) =>
      row.original.ok ? (
        <BracketTag label="pass" tone="success" />
      ) : (
        <BracketTag label="fail" tone="destructive" emphasis />
      ),
  },
  {
    accessorKey: 'status',
    header: 'http',
    size: 60,
    cell: ({ row }) => row.original.status ?? 'n/a',
  },
  {
    accessorKey: 'ms',
    header: 'ms',
    size: 70,
    cell: ({ row }) => formatInt(row.original.ms),
  },
  {
    accessorKey: 'error',
    header: 'error',
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className="block max-w-xs truncate text-muted-foreground"
        title={row.original.error ?? ''}
      >
        {row.original.error ?? ''}
      </span>
    ),
  },
];

const ENDPOINT_LABELS: Record<string, string> = {
  transferServer: 'sep6',
  transferServerSep24: 'sep24',
  directPaymentServer: 'sep31',
  anchorQuoteServer: 'sep38',
  webAuthEndpoint: 'sep10',
  kycServer: 'sep12',
};

export function AnchorProbeView({ probe }: { probe: AnchorProbeData }) {
  const failed = probe.stages.find((stage) => !stage.ok);
  const endpoints = probe.toml
    ? Object.entries(probe.toml.endpoints).filter((entry): entry is [string, string] => !!entry[1])
    : [];

  return (
    <ResultCard
      title={probe.domain}
      aside={
        failed ? (
          <BracketTag label={`fails at ${failed.stage}`} tone="destructive" emphasis />
        ) : (
          <BracketTag label="conformant" tone="success" />
        )
      }
    >
      <DataTable
        columns={stageColumns}
        data={probe.stages}
        getRowId={(stage) => stage.stage}
        emptyState={<p className="text-xs text-muted-foreground">No stages ran.</p>}
      />
      {probe.toml && (
        <KeyValueList
          items={[
            {
              label: 'signing key',
              value: probe.toml.signingKey ? <Address value={probe.toml.signingKey} /> : 'missing',
            },
            { label: 'accounts', value: probe.toml.accounts.length },
            {
              label: 'currencies',
              value: probe.toml.currencies.map((currency) => currency.code).join(' ') || 'none',
            },
            { label: 'version', value: probe.toml.version ?? 'n/a' },
          ]}
        />
      )}
      {endpoints.length > 0 && (
        <div className="space-y-1">
          <StatLabel>endpoints</StatLabel>
          <ul className="space-y-0.5 font-mono text-xs">
            {endpoints.map(([key, url]) => (
              <li key={key} className="flex gap-2">
                <span className="w-12 shrink-0 text-muted-foreground">
                  {ENDPOINT_LABELS[key] ?? key}
                </span>
                <span className="truncate text-foreground">{url}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {probe.anchorTests && (
        <div className="space-y-1">
          <StatLabel>anchor tests</StatLabel>
          <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-xs">
            {Object.entries(probe.anchorTests.perSep).map(([sep, result]) => (
              <li key={sep}>
                {sep} <span className="text-success">{result.passed}</span>/
                <span className={result.failed ? TONE_TEXT.destructive : TONE_TEXT.muted}>
                  {result.failed}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {probe.findings.length > 0 && (
        <div className="space-y-1">
          <StatLabel>findings</StatLabel>
          <ul className="space-y-0.5 font-mono text-xs">
            {probe.findings.map((finding) => (
              <li key={finding.findingId} className="flex items-center gap-2">
                <SeverityTag severity={finding.severity} />
                <span className="text-foreground">{finding.type.toLowerCase()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ResultCard>
  );
}
