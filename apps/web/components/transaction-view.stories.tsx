import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { TransactionView as TransactionViewData } from '@/lib/tool-views';
import { TransactionView } from './transaction-view';

const TX: TransactionViewData = {
  hash: 'f'.repeat(56) + '0000fake',
  ledger: 1000001,
  createdAt: '2026-01-01T00:00:00Z',
  successful: false,
  source: 'GFAKESOURCEFORSTORYBOOK000000000000000000000000000000SRC',
  feeCharged: 100,
  maxFee: 1000,
  operationCount: 1,
  operations: [{ type: 'payment' }],
  memoType: 'none',
  timebounds: { minTime: null, maxTime: '2026-01-01T00:05:00Z' },
  resultCodes: { tx: 'tx_failed', ops: ['op_no_trust'] },
  feeBump: null,
};

const meta: Meta<typeof TransactionView> = {
  component: TransactionView,
  title: 'renderers/TransactionView',
  args: { transaction: TX },
};
export default meta;

type Story = StoryObj<typeof TransactionView>;

export const Failed: Story = {};

export const Successful: Story = {
  args: {
    transaction: {
      ...TX,
      successful: true,
      resultCodes: { tx: 'tx_success', ops: ['op_success', 'op_success'] },
      operationCount: 2,
      operations: [
        { type: 'change_trust' },
        { type: 'payment', source: 'GFAKEOPSOURCE0000000000000000000000000000000000000000OP' },
      ],
    },
  },
};

export const FeeBump: Story = {
  args: {
    transaction: {
      ...TX,
      resultCodes: { tx: 'tx_fee_bump_inner_failed', ops: ['op_underfunded'] },
      feeBump: {
        feeSource: 'GFAKEFEESOURCE000000000000000000000000000000000000000FEE',
        innerHash: 'e'.repeat(64),
      },
    },
  },
};
