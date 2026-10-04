import type * as React from 'react';
import { DataTable, type DataTableProps } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { formatDecimal } from '@/lib/format';

export const fileHref = (name: string): string => `/report/files/${name}`;

export const count = (value: number): string => formatDecimal(value, 0);

export const xlm = (value: number): string => `${formatDecimal(value, 2)} XLM`;

const PAGE_SIZE = 10;

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

export const Wrap = ({ children }: { children: React.ReactNode }) => (
  <span className="block min-w-64 whitespace-normal">{children}</span>
);

export function ReportDataTable<TData>(
  props: Omit<DataTableProps<TData, unknown>, 'emptyState'> & { empty?: string },
) {
  const { empty = 'No rows.', ...rest } = props;
  return (
    <DataTable clientPageSize={PAGE_SIZE} emptyState={<EmptyState title={empty} />} {...rest} />
  );
}

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
