import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ReportTable } from './report-table';

type Row = { code: string; count: number; fix: string };

const ROWS: Row[] = [
  {
    code: 'op_underfunded',
    count: 67202,
    fix: 'Monitor the float and rebalance from treasury before paying.',
  },
  {
    code: 'op_no_trust',
    count: 28866,
    fix: 'Check the trustline first; sponsor it (CAP-33) or use a claimable balance.',
  },
];

const meta: Meta = { title: 'components/ReportTable' };
export default meta;

type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <ReportTable
      rows={ROWS}
      rowKey={(row) => row.code}
      columns={[
        { header: 'code', cell: (row) => row.code },
        { header: 'count', align: 'right', cell: (row) => row.count.toLocaleString('en-US') },
        { header: 'fix', wrap: true, cell: (row) => row.fix },
      ]}
    />
  ),
};

export const Empty: Story = {
  render: () => (
    <ReportTable rows={[] as Row[]} rowKey={(row) => row.code} columns={[]} empty="No rows yet." />
  ),
};
