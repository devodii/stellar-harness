import Link from 'next/link';
import { HowItWorksSteps } from '@/components/how-it-works';
import { REPO_URL } from '@/lib/links';

const LINK_CLASS = 'underline underline-offset-4 hover:text-muted-foreground';

export const ABOUT_DEMO_LINE = 'This demo does steps 1 to 3 on testnet. Step 4 is being built.';

export const ABOUT_SECTIONS = [
  {
    title: "Who it's for",
    body: 'Teams that run payouts, treasuries, assets or contracts on Stellar. Not individual traders.',
  },
  {
    title: 'Is it an AI doing things on its own?',
    body: 'No. Detection and fixes are tested code. The AI explains problems and proposes fixes in plain words. Every action runs under spending rules the network enforces: allowed actions, a daily cap, and a passkey for anything above your limit. You can also use the harness without the chat, through the SDK and CLI.',
  },
  {
    title: 'What if the AI is wrong or a key leaks?',
    body: 'The rules live in an OpenZeppelin smart account on Stellar, not in the AI. A wrong proposal or a leaked key still cannot go past the daily cap or the allowed destinations, and the owner can revoke access with one passkey signature.',
  },
  {
    title: 'Why does the report cover all of mainnet?',
    body: 'To show how often these problems happen. It reads only public data, the same data any block explorer shows, and never signs or sends anything.',
  },
  {
    title: 'Pricing',
    body: 'Free on testnet. On mainnet, a monthly subscription per organisation.',
  },
] as const;

export function About() {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <HowItWorksSteps />
        <p className="text-muted-foreground">{ABOUT_DEMO_LINE}</p>
      </div>
      {ABOUT_SECTIONS.map((section) => (
        <section key={section.title} className="space-y-2">
          <h2 className="text-base font-medium">{section.title}</h2>
          <p className="text-muted-foreground">{section.body}</p>
        </section>
      ))}
      <p className="flex gap-6">
        <Link href="/report" className={LINK_CLASS}>
          See the mainnet report
        </Link>
        <a href={REPO_URL} target="_blank" rel="noreferrer" className={LINK_CLASS}>
          Source on GitHub
        </a>
      </p>
    </div>
  );
}
