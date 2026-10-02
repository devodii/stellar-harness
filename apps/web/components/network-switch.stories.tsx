import type { Network } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { NetworkProvider } from './network-provider';
import { NetworkSwitch } from './network-switch';
import { NetworkTag } from './network-tag';

type Args = { initialNetwork: Network; persist: (network: Network) => Promise<void> };

const meta: Meta<Args> = {
  title: 'chat/NetworkSwitch',
  args: { initialNetwork: 'mainnet', persist: fn(async () => {}) },
  render: ({ initialNetwork, persist }) => (
    <NetworkProvider initialNetwork={initialNetwork} persist={persist}>
      <div className="flex items-center gap-2">
        <NetworkSwitch />
        <NetworkTag />
      </div>
    </NetworkProvider>
  ),
};
export default meta;

type Story = StoryObj<Args>;

export const Mainnet: Story = {};

export const Testnet: Story = { args: { initialNetwork: 'testnet' } };

export const PersistsAndShowsTag: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('combobox', { name: 'Network' }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole('option', { name: 'testnet' }));
    await expect(args.persist).toHaveBeenCalledWith('testnet');
    await expect(await canvas.findByText('[testnet]')).toBeInTheDocument();
  },
};
