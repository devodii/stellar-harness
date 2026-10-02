'use client';

import { type Finding, severityRank } from '@harness/schema';
import { DatabaseIcon } from '@phosphor-icons/react/ssr';
import type { ColumnDef } from '@tanstack/react-table';
import type * as React from 'react';
import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { DataTable, type DataTablePagination } from '@/components/data-table';
import { EmptyState } from '@/components/empty-state';
import { SeverityTag } from '@/components/severity-tag';
import { subjectHref } from '@/lib/links';

const MAX_TAGS = 3;

export function FindingSubject({ finding }: { finding: Finding }) {
  const href = subjectHref(finding.subjectKind, finding.subject);
  if (finding.subjectKind === 'account' || finding.subjectKind === 'contract') {
    return <Address value={finding.subject} href={href} />;
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={(event) => event.stopPropagation()}
      className="font-mono text-xs underline-offset-2 hover:underline"
    >
      {finding.subject}
    </a>
  );
}

export function FindingTags({ tags }: { tags: string[] }) {
  const shown = tags.slice(0, MAX_TAGS);
  return (
    <span className="flex flex-wrap gap-1">
      {shown.map((tag) => (
        <BracketTag key={tag} label={tag} />
      ))}
      {tags.length > MAX_TAGS && (
        <span className="font-mono text-xs text-muted-foreground">+{tags.length - MAX_TAGS}</span>
      )}
    </span>
  );
}

export const findingColumns: ColumnDef<Finding>[] = [
  {
    accessorKey: 'severity',
    header: 'severity',
    size: 96,
    sortingFn: (a, b) => severityRank(a.original.severity) - severityRank(b.original.severity),
    cell: ({ row }) => <SeverityTag severity={row.original.severity} />,
  },
  {
    accessorKey: 'type',
    header: 'type',
    cell: ({ row }) => <span className="text-foreground">{row.original.type.toLowerCase()}</span>,
  },
  {
    accessorKey: 'subject',
    header: 'subject',
    enableSorting: false,
    cell: ({ row }) => <FindingSubject finding={row.original} />,
  },
  {
    accessorKey: 'tags',
    header: 'tags',
    enableSorting: false,
    cell: ({ row }) => <FindingTags tags={row.original.tags} />,
  },
];

export interface FindingsTableProps {
  rows: Finding[];
  onRowClick?: (finding: Finding) => void;
  isLoading?: boolean;
  pagination?: DataTablePagination;
  clientPageSize?: number;
  emptyState?: React.ReactNode;
  className?: string;
}

export function FindingsTable({
  rows,
  onRowClick,
  isLoading,
  pagination,
  clientPageSize,
  emptyState,
  className,
}: FindingsTableProps) {
  return (
    <DataTable
      columns={findingColumns}
      data={rows}
      getRowId={(finding) => finding.findingId}
      onRowClick={onRowClick}
      isLoading={isLoading}
      pagination={pagination}
      clientPageSize={clientPageSize}
      className={className}
      emptyState={
        emptyState ?? (
          <EmptyState
            icon={DatabaseIcon}
            title="No findings"
            description="Nothing matches, or the scanner has not run yet."
          />
        )
      }
    />
  );
}
