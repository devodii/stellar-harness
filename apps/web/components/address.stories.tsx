import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Address } from './address';

const FAKE_ACCOUNT = 'GFAKEACCOUNTFORSTORYBOOKONLY00000000000000000000000000XYZ';
const FAKE_HASH = '0000000000000000000000000000000000000000000000000000000000fake01';

const meta: Meta<typeof Address> = {
  component: Address,
  title: 'components/Address',
  args: { value: FAKE_ACCOUNT },
};
export default meta;

type Story = StoryObj<typeof Address>;

export const Account: Story = {};

export const TransactionHash: Story = { args: { value: FAKE_HASH, head: 6, tail: 6 } };

export const Linked: Story = { args: { href: 'https://example.com/account' } };

export const WithoutCopy: Story = { args: { copyable: false } };

export const ShortValue: Story = { args: { value: 'example.org' } };
