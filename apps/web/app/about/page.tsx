import { ROADMAP_NOTE } from '@harness/schema';
import type { Metadata } from 'next';
import type * as React from 'react';
import { Container } from '@/components/container';
import { PageHeader } from '@/components/page-header';
import { StatLabel } from '@/components/stat';

export const metadata: Metadata = { title: 'About · Stellar Harness' };

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

export default function AboutPage() {
  return (
    <Container size="md" className="pb-12">
      <PageHeader
        title="About"
        description="An operator harness for Stellar: measure operational debt, explain it, plan the fix."
      />
      <Section label="what it is">
        <p>
          A large share of what goes wrong on Stellar mainnet every day is routine operational
          failure: sequence collisions, missing trustlines, archived contracts, anchors whose
          endpoints have drifted. Stellar Harness treats those as findings a policy-gated agent can
          detect, plan around and, later, fix.
        </p>
        <p>
          It has three parts: a scanner that measures this debt from public read-only data, a set of
          typed tools (read, explain, simulate, plan), and this chat, where an agent uses the same
          tools to answer questions about specific accounts, transactions, contracts and anchors.
        </p>
      </Section>
      <Section label="what the demo does">
        <ul className="list-disc space-y-1 pl-5">
          <li>Reads mainnet through Horizon, Soroban RPC, stellar.expert and Stellar Light.</li>
          <li>
            Switches to testnet from the prompt footer. Testnet data is kept apart from mainnet, and
            the ecosystem directory stays mainnet-only.
          </li>
          <li>Decodes failed transactions and explains their result codes in plain language.</li>
          <li>Probes anchor stellar.toml files and SEP endpoints, stage by stage.</li>
          <li>Simulates TTL extension and restore to price contract rent.</li>
          <li>Pre-flights payments and proposes an alternative when they would fail.</li>
          <li>Shows a plan with a policy boundary before anything that would spend or submit.</li>
        </ul>
      </Section>
      <Section label="what it does not do">
        <ul className="list-disc space-y-1 pl-5">
          <li>No transaction is signed or broadcast. Mainnet access is read-only.</li>
          <li>No secret key is generated, stored or requested.</li>
          <li>Simulation results and unsigned XDR are shown for inspection only.</li>
          <li>No database: chats stay in this browser&apos;s local storage.</li>
        </ul>
        <p className="font-mono text-xs text-muted-foreground">{ROADMAP_NOTE}</p>
      </Section>
    </Container>
  );
}
