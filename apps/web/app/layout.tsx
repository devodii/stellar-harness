import type { Metadata } from 'next';
import { Instrument_Serif, Outfit } from 'next/font/google';
import type * as React from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import './globals.css';

const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'] });

const instrumentSerif = Instrument_Serif({
  variable: '--font-display-instrument',
  subsets: ['latin'],
  weight: '400',
});

export const metadata: Metadata = {
  title: 'Stellar Harness',
  description: 'The operator agent for one organisation on Stellar.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
