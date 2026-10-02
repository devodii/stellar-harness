import type { Network } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NetworkProvider } from './network-provider';
import { NetworkTag } from './network-tag';

const meta: Meta<{ network: Network }> = {
  title: 'shell/NetworkTag',
  args: { network: 'testnet' },
  render: ({ network }) => (
    <NetworkProvider initialNetwork={network} persist={async () => {}}>
      <NetworkTag />
    </NetworkProvider>
  ),
};
export default meta;

type Story = StoryObj<{ network: Network }>;

export const Testnet: Story = {};

export const MainnetRendersNothing: Story = { args: { network: 'mainnet' } };
