import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'About Stellar Harness' };

const AGENT_SIGNING_ISSUE = 'https://github.com/Creit-Tech/Stellar-Wallets-Kit/issues/111';

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-xl space-y-8 px-4 py-12 text-sm leading-relaxed">
      <Link
        href="/"
        className="block font-mono text-xs text-muted-foreground hover:text-foreground"
      >
        ← back to the harness
      </Link>
      <section className="space-y-2">
        <h1 className="font-medium">What the harness does</h1>
        <p>
          It watches an organisation&apos;s accounts, contracts and anchor on Stellar, explains what
          it finds in plain language, simulates each fix to get its real cost, and proposes the fix
          as an action that is either within the organisation&apos;s policy or needs approval.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">What it will do</h2>
        <p>
          Execute those actions itself under an OpenZeppelin smart-account policy, with passkey
          approval from the owner for anything above the organisation&apos;s limits.
        </p>
      </section>
      <section className="space-y-2">
        <h2 className="font-medium">Ecosystem work</h2>
        <p>
          We are contributing to the agent-signing standard proposed in{' '}
          <a
            href={AGENT_SIGNING_ISSUE}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            issue #111
          </a>
          .
        </p>
      </section>
    </main>
  );
}
