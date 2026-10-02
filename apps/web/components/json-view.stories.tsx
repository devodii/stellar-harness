import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { JsonView } from './json-view';

const EVIDENCE = {
  count: 42,
  firstLedger: 1000001,
  lastLedger: 1000420,
  sameLedgerCollisions: 7,
  multisig: false,
  homeDomain: null,
  codes: ['tx_bad_seq', 'op_underfunded'],
  nested: { ratio: 0.125, note: 'synthetic story data' },
};

const meta: Meta<typeof JsonView> = {
  component: JsonView,
  title: 'components/JsonView',
  args: { value: EVIDENCE },
};
export default meta;

type Story = StoryObj<typeof JsonView>;

export const Default: Story = {};

export const Compact: Story = { args: { maxHeight: 120 } };

export const Primitive: Story = { args: { value: 'just a string' } };

export const WithoutCopy: Story = { args: { copyable: false } };
