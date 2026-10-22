import { ArrowLeftIcon } from '@phosphor-icons/react/ssr';
import type { Metadata } from 'next';
import Link from 'next/link';
import { About } from '@/components/about';
import { Button } from '@/components/ui/button';
import { Wordmark } from '@/components/wordmark';

const TITLE = 'How Stellar Harness works';
const DESCRIPTION =
  'An ops agent for teams on Stellar. Fixes run under spending rules enforced on-chain.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: 'website' },
  twitter: { title: TITLE, description: DESCRIPTION },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl space-y-8 px-4 py-10 text-sm">
      <header className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/">
              <ArrowLeftIcon aria-hidden />
              Back to the demo
            </Link>
          </Button>
          <Wordmark className="font-mono text-sm" />
        </div>
        <h1 className="text-2xl font-medium">How it works</h1>
      </header>
      <About />
    </main>
  );
}
