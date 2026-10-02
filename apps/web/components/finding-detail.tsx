import type { Finding } from '@harness/schema';
import { AccentBlock } from '@/components/accent-block';
import { FindingSubject, FindingTags } from '@/components/findings-table';
import { JsonView } from '@/components/json-view';
import { KeyValueList } from '@/components/key-value-list';
import { SeverityTag } from '@/components/severity-tag';
import { StatLabel } from '@/components/stat';
import { formatDateTime, formatInt } from '@/lib/format';

export function FindingDetail({ finding }: { finding: Finding }) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityTag severity={finding.severity} />
        <FindingSubject finding={finding} />
      </div>
      <KeyValueList
        columns={1}
        items={[
          { label: 'subject kind', value: finding.subjectKind },
          { label: 'snapshot ledger', value: formatInt(finding.snapshotLedger) },
          { label: 'observed', value: `${formatDateTime(finding.observedAt)} UTC` },
          { label: 'finding id', value: finding.findingId.slice(0, 16) },
        ]}
      />
      {finding.tags.length > 0 && <FindingTags tags={finding.tags} />}
      <AccentBlock label="suggested action">
        <p className="text-sm text-foreground">{finding.suggestedAction}</p>
      </AccentBlock>
      <div className="space-y-1">
        <StatLabel>evidence</StatLabel>
        <JsonView value={finding.evidence} maxHeight={420} />
      </div>
    </div>
  );
}
