import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { KeyValueList } from '@/components/key-value-list';
import { ResultSection } from '@/components/result-section';
import { Stat } from '@/components/stat';
import { useExplorer } from '@/hooks/use-explorer';
import { formatDays, formatInt, formatSeconds } from '@/lib/format';
import type { Tone } from '@/lib/tone';
import type { ContractTtlView as ContractTtlData, TtlEntryView } from '@/lib/tool-views';

export const ttlTone = (entry: TtlEntryView): Tone => {
  if (entry.archived || !entry.present) return 'destructive';
  if (entry.daysLeft !== null && entry.daysLeft < 30) return 'warning';
  return 'default';
};

const ttlLabel = (entry: TtlEntryView): string => {
  if (!entry.present) return 'missing';
  if (entry.archived) return 'archived';
  return 'live';
};

function TtlEntry({ label, entry }: { label: string; entry: TtlEntryView }) {
  const tone = ttlTone(entry);
  return (
    <div className="space-y-1.5 rounded-md border border-border p-2.5">
      <div className="flex items-center justify-between">
        <Stat
          label={label}
          value={entry.daysLeft}
          format={formatDays}
          tone={tone}
          hint="days left"
        />
        <BracketTag label={ttlLabel(entry)} tone={tone === 'default' ? 'success' : tone} />
      </div>
      <KeyValueList
        columns={1}
        items={[
          {
            label: 'live until',
            value: entry.liveUntilLedgerSeq === null ? 'n/a' : formatInt(entry.liveUntilLedgerSeq),
          },
          {
            label: 'ledgers left',
            value: entry.ledgersLeft === null ? 'n/a' : formatInt(entry.ledgersLeft),
          },
        ]}
      />
    </div>
  );
}

export function ContractTtlView({ ttl }: { ttl: ContractTtlData }) {
  const { explorerUrl } = useExplorer();
  return (
    <ResultSection
      title={<Address value={ttl.contractId} href={explorerUrl('contract', ttl.contractId)} />}
      footer={`snapshot ledger ${formatInt(ttl.snapshotLedger)} · close ${formatSeconds(ttl.ledgerCloseSeconds)}`}
    >
      <div className="grid gap-2 sm:grid-cols-2">
        <TtlEntry label="instance" entry={ttl.instance} />
        <TtlEntry label="code" entry={ttl.code} />
      </div>
      <KeyValueList
        items={[
          {
            label: 'wasm',
            value: ttl.wasmHash ? <Address value={ttl.wasmHash} head={6} tail={6} /> : 'n/a',
          },
          {
            label: 'invocations',
            value: ttl.invocations === null ? 'n/a' : formatInt(ttl.invocations),
          },
        ]}
      />
    </ResultSection>
  );
}
