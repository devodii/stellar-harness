import type * as React from 'react';
import { formatDecimal } from '@/lib/format';

export const fileHref = (name: string): string => `/report/files/${name}`;

export const count = (value: number): string => formatDecimal(value, 0);

export const percent = (part: number, whole: number): string => {
  if (whole <= 0) return 'n/a';
  const value = (part / whole) * 100;
  return value > 0 && value < 0.1 ? '<0.1%' : `${formatDecimal(value, 1)}%`;
};

export const xlm = (value: number): string => `${formatDecimal(value, 2)} XLM`;

export const TextLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target={href.startsWith('/') || href.startsWith('#') ? undefined : '_blank'}
    rel="noreferrer"
    className="underline decoration-border underline-offset-2 hover:decoration-foreground"
  >
    {children}
  </a>
);

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-8 space-y-4 border-t pt-8">
      <h2 className="font-medium">
        <a href={`#${id}`} className="hover:underline">
          {title}
        </a>
      </h2>
      {children}
    </section>
  );
}
