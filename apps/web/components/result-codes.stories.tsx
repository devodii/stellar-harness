import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ResultCodes } from './result-codes';

const meta: Meta<typeof ResultCodes> = {
  component: ResultCodes,
  title: 'components/ResultCodes',
  args: { codes: { tx: 'tx_failed', ops: ['op_success', 'op_no_trust'] } },
};
export default meta;

type Story = StoryObj<typeof ResultCodes>;

export const OperationFailure: Story = {};

export const TransactionLevel: Story = { args: { codes: { tx: 'tx_bad_seq', ops: [] } } };

export const Success: Story = { args: { codes: { tx: 'tx_success', ops: ['op_success'] } } };
