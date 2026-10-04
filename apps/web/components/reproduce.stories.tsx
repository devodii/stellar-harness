import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Reproduce } from './reproduce';

const meta: Meta<typeof Reproduce> = {
  component: Reproduce,
  title: 'components/Reproduce',
  args: {
    lines: [
      'POST https://mainnet.sorobanrpc.com getTransactions (limit 200, paged per 100-ledger chunk)',
      'for ledgers 64706209 to 64723488; result codes decoded from result_xdr',
    ],
  },
};
export default meta;

export const Default: StoryObj<typeof Reproduce> = {};
