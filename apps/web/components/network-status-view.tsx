import { BracketTag } from '@/components/bracket-tag';
import { ResultSection } from '@/components/result-section';
import { Stat } from '@/components/stat';
import { formatDateTime, formatDays, formatInt } from '@/lib/format';
import type { NetworkStatusView as NetworkStatusData } from '@/lib/tool-views';

const NOMINAL_CLOSE_SECONDS = 5;

export function NetworkStatusView({ status }: { status: NetworkStatusData }) {
  const retentionDays = (status.rpc.retentionLedgers * NOMINAL_CLOSE_SECONDS) / 86_400;
  return (
    <ResultSection
      title={`${status.network} @ ledger ${formatInt(status.latestLedger)}`}
      aside={
        status.horizon.ok ? (
          <BracketTag label="horizon up" tone="success" />
        ) : (
          <BracketTag label="horizon down" tone="warning" />
        )
      }
      footer={status.closedAt ? `closed ${formatDateTime(status.closedAt)} UTC` : undefined}
    >
      <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="latest ledger" value={status.latestLedger} format={formatInt} />
        <Stat label="protocol" value={status.protocolVersion} />
        <Stat
          label="rpc history"
          value={retentionDays}
          format={formatDays}
          hint={`from ${formatInt(status.rpc.oldestLedger)}`}
        />
        <Stat
          label="horizon lag"
          value={status.horizon.lagLedgers}
          format={(lag) => `${formatInt(lag)} ledgers`}
          tone={status.horizon.ok ? 'default' : 'muted'}
        />
      </div>
    </ResultSection>
  );
}
