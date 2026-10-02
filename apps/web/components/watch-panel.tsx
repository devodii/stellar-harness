import type { AnchorProbe } from '@harness/stellar-tools';
import type * as React from 'react';
import { ActionCard } from '@/components/action-card';
import { CopyId } from '@/components/copy-id';
import { formatXlm } from '@/lib/format';
import type { Watch, WatchedContract } from '@/lib/harness';

const anchorStatus = (probe: AnchorProbe | null): string => {
  if (!probe) return 'unavailable';
  const failing = probe.stages.find((stage) => stage.status === 'fail');
  if (failing) return `${failing.name} failed`;
  return probe.stages
    .filter((stage) => stage.status === 'ok' && stage.name !== 'signing key')
    .map((stage) => `${stage.name} ok`)
    .join(' · ');
};

const contractStatus = ({ ttl }: WatchedContract): string => {
  if (!ttl) return 'unavailable';
  if (ttl.instance.archived) return 'archived';
  return `${ttl.instance.daysLeft} days left`;
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-xs text-muted-foreground">{title}</h3>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Row({ label, id, value }: { label: string; id?: string; value: string }) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {id && <CopyId id={id} />}
      </div>
      <span className="shrink-0 font-mono text-xs">{value}</span>
    </li>
  );
}

export function WatchPanel({ watch, anchorDomain }: { watch: Watch; anchorDomain?: string }) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-r p-4">
      <h2 className="font-medium">What the harness watches</h2>
      <Section title="Accounts">
        {watch.accounts.map((account) => (
          <Row
            key={account.address}
            label={account.label}
            id={account.address}
            value={account.xlm === null ? 'unavailable' : formatXlm(account.xlm)}
          />
        ))}
      </Section>
      <Section title="Contracts">
        {watch.contracts.map((contract) => (
          <Row
            key={contract.id}
            label={contract.label}
            id={contract.id}
            value={contractStatus(contract)}
          />
        ))}
      </Section>
      {anchorDomain && (
        <Section title="Anchor">
          <li>
            <p className="text-sm">{anchorDomain}</p>
            <p className="font-mono text-xs">{anchorStatus(watch.anchor)}</p>
          </li>
        </Section>
      )}
      <section className="mt-auto space-y-1">
        <h3 className="text-xs text-muted-foreground">Proposed actions</h3>
        {watch.actions.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          watch.actions.map((action) => <ActionCard key={action.id} action={action} compact />)
        )}
      </section>
    </aside>
  );
}
