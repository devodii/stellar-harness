import type { Metadata } from 'next';
import { Instrument_Serif, Outfit } from 'next/font/google';
import type * as React from 'react';
import { AppShell } from '@/components/app-shell';
import { ConversationsProvider } from '@/components/conversations-provider';
import { NetworkProvider } from '@/components/network-provider';
import { Providers } from '@/components/providers';
import { getRequestNetwork } from '@/lib/network';
import './globals.css';

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'] });

const instrumentSerif = Instrument_Serif({
  variable: '--font-display-instrument',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Stellar Harness',
  description: 'An operator harness for Stellar: detect, plan and simulate. Read-only.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const network = await getRequestNetwork();
  return (
    <html
      lang="en"
      data-network={network}
      className={`${outfit.variable} ${instrumentSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="h-full font-sans">
        <Providers>
          <NetworkProvider initialNetwork={network}>
            <ConversationsProvider>
              <AppShell>{children}</AppShell>
            </ConversationsProvider>
          </NetworkProvider>
        </Providers>
      </body>
    </html>
  );
}
