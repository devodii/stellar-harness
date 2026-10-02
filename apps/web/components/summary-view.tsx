import type { Summary } from '@harness/schema';
import { BracketTag } from '@/components/bracket-tag';
import { ResultSection } from '@/components/result-section';
import { Stat, StatLabel } from '@/components/stat';
import { formatDateTime, formatInt, formatPercent, formatXlm } from '@/lib/format';
import { hasScanData, summaryMetrics, topCodes } from '@/lib/summary';

export function SummaryView({ summary }: { summary: Summary }) {
  const metrics = summaryMetrics(summary);
  const scanned = hasScanData(summary);
  const codes = topCodes(summary.failures.preventable.byCode);

  return (
    <ResultSection
      title={`summary @ ledger ${formatInt(summary.snapshot.snapshotLedger)}`}
      aside={!scanned && <BracketTag label="no scan data" tone="warning" />}
      footer={`snapshot ${formatDateTime(summary.snapshot.snapshotTime)} · git ${summary.snapshot.gitSha.slice(0, 7)}`}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat
          label={`failed tx ${metrics.windowDays}d`}
          value={metrics.txFailed}
          tone="destructive"
        />
        <Stat
          label="preventable"
          value={metrics.preventableShare}
          format={(share) => formatPercent(share)}
          hint={`${formatInt(metrics.preventable)} tx`}
        />
        <Stat label="clusters" value={metrics.clusters} />
        <Stat label="archived" value={metrics.archivedContracts} tone="warning" />
        <Stat label="expiring 30d" value={metrics.expiring30d} />
        <Stat
          label="anchors failing"
          value={metrics.anchorsFailing}
          hint={`of ${formatInt(metrics.anchorsTested)} tested`}
        />
        <Stat label="rent 12m" value={metrics.rentXlm12m} format={formatXlm} size="sm" />
        <Stat label="scf archived" value={summary.contracts.scfFunded.archived} />
      </div>
      {codes.length > 0 && (
        <div className="space-y-1">
          <StatLabel>top preventable codes</StatLabel>
          <ul className="space-y-0.5 font-mono text-xs">
            {codes.map(([code, count]) => (
              <li key={code} className="flex justify-between gap-3">
                <span className="text-foreground">{code}</span>
                <span className="tabular-nums text-muted-foreground">{formatInt(count)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ResultSection>
  );
}
