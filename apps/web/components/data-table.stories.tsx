import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { ColumnDef } from '@tanstack/react-table';
import * as React from 'react';
import { expect, userEvent, within } from 'storybook/test';
import { DataTable } from './data-table';
import { EmptyState } from './empty-state';
import { ExplorerLink } from './explorer-link';
import { fakeContract } from './story-ids';

interface DemoRow {
  contract: string;
  invocations: number;
  daysLeft: number;
}

const ROWS: DemoRow[] = Array.from({ length: 23 }, (_, i) => ({
  contract: fakeContract(`row${i}`),
  invocations: 100 + i * 37,
  daysLeft: (i * 1.3) % 30,
}));

const COLUMNS: ColumnDef<DemoRow>[] = [
  {
    accessorKey: 'contract',
    header: 'contract',
    cell: ({ row }) => <ExplorerLink kind="contract" id={row.original.contract} />,
  },
  { accessorKey: 'invocations', header: 'invocations' },
  { accessorKey: 'daysLeft', header: 'days left', cell: ({ row }) => row.original.daysLeft.toFixed(1) },
];

const meta: Meta<typeof DataTable<DemoRow, unknown>> = {
  component: DataTable,
  title: 'components/DataTable',
  args: {
    columns: COLUMNS,
    data: ROWS.slice(0, 6),
    getRowId: (row: DemoRow) => row.contract,
    emptyState: <EmptyState title="No rows" />,
  },
};
export default meta;

type Story = StoryObj<typeof DataTable<DemoRow, unknown>>;

export const Default: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { data: [] } };

export const Regular: Story = { args: { density: 'regular' } };

export const ClientPaginated: Story = {
  args: { data: ROWS, clientPageSize: 10 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('page 1 of 3, 23 rows')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: 'Next' }));
    await expect(canvas.getByText('page 2 of 3, 23 rows')).toBeInTheDocument();
  },
};

function ServerPaginatedDemo() {
  const [pageIndex, setPageIndex] = React.useState(0);
  const pageSize = 5;
  return (
    <DataTable
      columns={COLUMNS}
      data={ROWS.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize)}
      getRowId={(row) => row.contract}
      emptyState={<EmptyState title="No rows" />}
      pagination={{ pageIndex, pageSize, total: ROWS.length, onPageChange: setPageIndex }}
    />
  );
}

export const ServerPaginated: Story = { render: () => <ServerPaginatedDemo /> };
