import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { CopyButton } from '@/components/copy-button';
import { KeyValueList } from '@/components/key-value-list';
import { ResultSection } from '@/components/result-section';
import { Stat, StatLabel } from '@/components/stat';
import { useExplorer } from '@/hooks/use-explorer';
import { formatInt, formatXlm } from '@/lib/format';
import type { ExtendTtlView, RestoreView } from '@/lib/tool-views';

export type SimulationCostData = ExtendTtlView | RestoreView;

const isExtend = (simulation: SimulationCostData): simulation is ExtendTtlView =>
  'extendToLedgers' in simulation;

export interface SimulationCostViewProps {
  simulation: SimulationCostData;
  xlmUsd?: number;
}

export function SimulationCostView({ simulation, xlmUsd }: SimulationCostViewProps) {
  const { explorerUrl } = useExplorer();
  const extend = isExtend(simulation);
  return (
    <ResultSection
      title={
        <span className="flex items-center gap-2">
          {extend ? 'extend ttl' : 'restore'}
          <Address
            value={simulation.contractId}
            href={explorerUrl('contract', simulation.contractId)}
          />
        </span>
      }
      aside={<BracketTag label="simulated" tone="primary" />}
    >
      <div className="flex flex-wrap items-end gap-6">
        <Stat label="estimated cost" value={simulation.estimatedXlm} format={formatXlm} />
        {xlmUsd !== undefined && xlmUsd > 0 && (
          <Stat
            label="usd"
            value={simulation.estimatedXlm * xlmUsd}
            format={(usd) => `$${usd.toFixed(2)}`}
            size="sm"
          />
        )}
      </div>
      <KeyValueList
        items={[
          {
            label: 'min resource fee',
            value: `${formatInt(simulation.minResourceFeeStroops)} stroops`,
          },
          extend
            ? {
                label: 'extend by',
                value: `${simulation.days}d (${formatInt(simulation.extendToLedgers)} ledgers)`,
              }
            : { label: 'entries', value: simulation.entries },
          { label: 'read only keys', value: simulation.footprint.readOnly.length },
          { label: 'read write keys', value: simulation.footprint.readWrite.length },
        ]}
      />
      <details className="group rounded-md border border-border">
        <summary className="flex cursor-pointer items-center justify-between px-2 py-1.5">
          <StatLabel>unsigned xdr (display only, never submitted)</StatLabel>
          <CopyButton value={simulation.unsignedXdr} label="Copy unsigned XDR" />
        </summary>
        <pre className="max-h-40 overflow-auto border-t border-border p-2 font-mono text-[11px] break-all whitespace-pre-wrap text-muted-foreground">
          {simulation.unsignedXdr}
        </pre>
      </details>
    </ResultSection>
  );
}
