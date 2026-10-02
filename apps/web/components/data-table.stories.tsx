import { DatabaseIcon } from '@phosphor-icons/react/ssr';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { fn } from 'storybook/test';
import { Address } from './address';
import { DataTable } from './data-table';
import { EmptyState } from './empty-state';
import { SeverityTag } from './severity-tag';

interface DemoRow {
  id: string;
  subject: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  type: string;
  count: number;
}

const ROWS: DemoRow[] = Array.from({ length: 23 }, (_, i) => ({
  id: String(i),
  subject: `GFAKE${String(i).padStart(3, '0')}STORYBOOKACCOUNT0000000000000000000000000000000${i % 10}`,
  severity: (['critical', 'high', 'medium', 'low', 'info'] as const)[i % 5] ?? 'info',
  type: ['TX_BAD_SEQ_CLUSTER', 'OP_NO_TRUST_CLUSTER', 'CONTRACT_INSTANCE_ARCHIVED'][i % 3] ?? '',
  count: 10 + i * 3,
}));

const COLUMNS: ColumnDef<DemoRow>[] = [
  {
    accessorKey: 'severity',
    header: 'severity',
    size: 90,
    cell: ({ row }) => <SeverityTag severity={row.original.severity} />,
  },
  { accessorKey: 'type', header: 'type' },
  {
    accessorKey: 'subject',
    header: 'subject',
    cell: ({ row }) => <Address value={row.original.subject} />,
  },
  { accessorKey: 'count', header: 'count', size: 70 },
];

const meta: Meta<typeof DataTable<DemoRow, unknown>> = {
  component: DataTable,
  title: 'components/DataTable',
  args: {
    columns: COLUMNS,
    data: ROWS.slice(0, 6),
    getRowId: (row: DemoRow) => row.id,
    emptyState: <EmptyState icon={DatabaseIcon} title="No rows" />,
    onRowClick: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof DataTable<DemoRow, unknown>>;

export const Default: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { data: [] } };

export const Regular: Story = { args: { density: 'regular' } };

export const ClientPaginated: Story = { args: { data: ROWS, clientPageSize: 8 } };

function ServerPaginatedDemo() {
  const [pageIndex, setPageIndex] = React.useState(0);
  const pageSize = 5;
  return (
    <DataTable
      columns={COLUMNS}
      data={ROWS.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
      getRowId={(row) => row.id}
      emptyState={<EmptyState title="No rows" />}
      pagination={{ pageIndex, pageSize, total: ROWS.length, onPageChange: setPageIndex }}
    />
  );
}

export const ServerPaginated: Story = { render: () => <ServerPaginatedDemo /> };
