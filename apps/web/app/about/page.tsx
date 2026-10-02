import { ROADMAP_NOTE } from '@harness/schema';
import type { Metadata } from 'next';
import type * as React from 'react';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { StatLabel } from '@/components/stat';
import { formatInt } from '@/lib/format';
import { readSummary } from '@/lib/storage';

export const metadata: Metadata = { title: 'About · Stellar Harness' };

export const dynamic = 'force-dynamic';

const REPORT_HREF = 'https://github.com/devodii/stellar-harness#censuses';

const readArchived = async () => {
  try {
    const { summary, scanned } = await readSummary('mainnet');
    if (!scanned) return null;
    return {
      total: summary.contracts.archivedInstances,
      active: summary.contracts.archivedMeaningful,
    };
  } catch {
    return null;
  }
};

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2 border-t border-border py-5">
      <h2>
        <StatLabel className="text-sm">{label}</StatLabel>
      </h2>
      <div className="space-y-2 text-sm leading-relaxed text-foreground">{children}</div>
    </section>
  );
}

export default async function AboutPage() {
  const archived = await readArchived();
  return (
    <Container size="md" className="pb-12">
      <PageHeader
        title="About"
        description="An operator harness for Stellar: measure operational debt, explain it, price the fix."
      />
      <Section label="what it is">
        <p>
          A large share of what goes wrong on Stellar mainnet every day is routine operational
          failure: sequence collisions, missing trustlines, archived contracts, anchors whose
          endpoints have drifted. Stellar Harness treats those as findings an agent can detect,
          explain and price, then hand to whoever has the authority to fix them.
        </p>
        <p>
          It has three parts: a scanner that measures this debt from public read-only data, a set of
          typed tools (read, explain, simulate, hand off), and this chat, where an agent uses the
          same tools to answer questions about specific accounts, transactions, contracts and
          anchors.
        </p>
      </Section>
      <Section label="what the demo does">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Observes the whole network through five censuses: contract archival, failed
            transactions, anchor conformance, rent and GitHub issues. The scanner writes the method,
            numbers and gaps to{' '}
            <a
              href={REPORT_HREF}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-xs underline underline-offset-4"
            >
              REPORT.md
            </a>
            .
          </li>
          <li>
            Reads live state through Horizon, Soroban RPC, stellar.expert and Stellar Light, on
            mainnet or, from the prompt footer, testnet.
          </li>
          <li>
            Simulates fixes with Soroban RPC{' '}
            <code className="font-mono text-xs">simulateTransaction</code> and reports what they
            would cost, then names who holds the authority to act.
          </li>
        </ul>
        {archived !== null && (
          <p className="font-mono text-xs text-muted-foreground">
            {formatInt(archived.total)} contract instances archived on mainnet in total,{' '}
            {formatInt(archived.active)} of them active (100+ invocations or SCF-funded).
          </p>
        )}
      </Section>
      <Section label="what it does not do">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            It does not hold keys, sign, submit or approve anything. Mainnet access is read-only.
          </li>
          <li>
            The funded roadmap adds execution under an organisation&apos;s smart-account policy.
          </li>
          <li>
            No secret key is generated, stored or requested. Chats stay in this browser&apos;s local
            storage.
          </li>
        </ul>
        <p className="font-mono text-xs text-muted-foreground">{ROADMAP_NOTE}</p>
      </Section>
    </Container>
  );
}
