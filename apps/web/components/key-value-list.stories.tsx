import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Address } from './address';
import { BracketTag } from './bracket-tag';
import { KeyValueList } from './key-value-list';

const meta: Meta<typeof KeyValueList> = {
  component: KeyValueList,
  title: 'components/KeyValueList',
  args: {
    items: [
      {
        label: 'source',
        value: <Address value="GFAKESOURCEACCOUNTFORSTORIES00000000000000000000000000AB" />,
      },
      { label: 'ledger', value: '1000001' },
      { label: 'fee charged', value: '100 stroops' },
      { label: 'status', value: <BracketTag label="failed" tone="destructive" /> },
      { label: 'memo', value: 'none' },
      { label: 'hidden row', value: 'never shown', hidden: true },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof KeyValueList>;

export const TwoColumns: Story = {};

export const OneColumn: Story = { args: { columns: 1 } };
