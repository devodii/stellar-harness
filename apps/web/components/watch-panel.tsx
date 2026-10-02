import type { Network } from '@harness/schema';
import type { AnchorProbe } from '@harness/stellar-tools';
import type * as React from 'react';
import { ActionCard } from '@/components/action-card';
import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { StatLabel } from '@/components/stat';
import { formatDecimal } from '@/lib/format';
import type { Watch, WatchedContract } from '@/lib/harness';
import { explorerUrl } from '@/lib/links';

const anchorStatus = (probe: AnchorProbe | null): string => {
  if (!probe) return 'unavailable';
  const failing = probe.stages.find((stage) => stage.status === 'fail');
  if (failing) return `${failing.name} failed`;
  return probe.stages
    .filter((stage) => stage.status === 'ok' && stage.name !== 'signing key')
    .map((stage) => `${stage.name} ok`)
    .join(' · ');
};

function ContractStatus({ ttl }: Pick<WatchedContract, 'ttl'>) {
  if (!ttl) return <span className="text-muted-foreground">unavailable</span>;
  if (ttl.instance.archived) return <BracketTag label="archived" tone="default" emphasis />;
  return <span>{formatDecimal(ttl.instance.daysLeft, 1)} days left</span>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <StatLabel>{title}</StatLabel>
      <ul className="space-y-2">{children}</ul>
    </section>
  );
}

function Row({
  label,
  address,
  value,
}: {
  label: string;
  address: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <li className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm">{label}</p>
        {address}
      </div>
      <span className="shrink-0 font-mono text-xs">{value}</span>
    </li>
  );
}

export interface WatchPanelProps {
  watch: Watch;
  network: Network;
  anchorDomain?: string;
}

export function WatchPanel({ watch, network, anchorDomain }: WatchPanelProps) {
  return (
    <aside className="flex w-[280px] shrink-0 flex-col gap-6 overflow-y-auto border-r p-4">
      <h2 className="font-medium">What the harness watches</h2>
      <Section title="accounts">
        {watch.accounts.map((account) => (
          <Row
            key={account.address}
            label={account.label}
            address={
              <Address
                value={account.address}
                href={explorerUrl('account', account.address, network)}
              />
            }
            value={
              account.xlm === null ? 'unavailable' : `${formatDecimal(Number(account.xlm), 2)} XLM`
            }
          />
        ))}
      </Section>
      <Section title="contracts">
        {watch.contracts.map((contract) => (
          <Row
            key={contract.id}
            label={contract.label}
            address={
              <Address value={contract.id} href={explorerUrl('contract', contract.id, network)} />
            }
            value={<ContractStatus ttl={contract.ttl} />}
          />
        ))}
      </Section>
      {anchorDomain && (
        <Section title="anchor">
          <li>
            <p className="text-sm">{anchorDomain}</p>
            <p className="font-mono text-xs">{anchorStatus(watch.anchor)}</p>
          </li>
        </Section>
      )}
      <section className="mt-auto">
        <StatLabel>proposed actions</StatLabel>
        {watch.actions.length === 0 ? (
          <p className="pt-1 text-sm text-muted-foreground">None yet.</p>
        ) : (
          watch.actions.map((action) => <ActionCard key={action.id} action={action} compact />)
        )}
      </section>
    </aside>
  );
}
