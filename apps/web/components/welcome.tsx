import type { Network } from '@harness/schema';
import Link from 'next/link';
import type * as React from 'react';
import { HowItWorksSteps } from '@/components/how-it-works';

export const VALUE_LINE =
  "Stellar Harness keeps a business's Stellar accounts and contracts working.";

export const valueDetail = (network: Network): string =>
  `Stellar Harness watches a business's Stellar accounts and contracts, catches what's about to break, and prepares the fix. Every action runs under spending rules enforced on-chain. This is a live demo for a sample company on ${network}.`;

const LINK_CLASS = 'underline underline-offset-4 hover:text-muted-foreground';

export interface WelcomeProps {
  network: Network;
  proof?: React.ReactNode;
}

export function Welcome({ network, proof }: WelcomeProps) {
  return (
    <section aria-labelledby="welcome-title" className="w-full space-y-6">
      <div className="space-y-2">
        <h1 id="welcome-title" className="text-xl font-medium text-balance sm:text-2xl">
          {VALUE_LINE}
        </h1>
        <p className="text-muted-foreground">{valueDetail(network)}</p>
      </div>
      <HowItWorksSteps />
      {proof}
      <p className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
        <Link href="/report" className={LINK_CLASS}>
          See what&apos;s breaking on mainnet now →
        </Link>
        <Link href="/about" className={LINK_CLASS}>
          How it works →
        </Link>
      </p>
    </section>
  );
}
