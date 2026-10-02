import type { Network } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { expect, fn, userEvent, waitFor, within } from 'storybook/test';
import { NetworkSelect, type NetworkSelectProps } from './network-select';

function Controlled(args: NetworkSelectProps) {
  const [value, setValue] = React.useState<Network>(args.value);
  return (
    <NetworkSelect
      {...args}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        args.onValueChange(next);
      }}
    />
  );
}

const meta: Meta<typeof NetworkSelect> = {
  component: NetworkSelect,
  title: 'chat/NetworkSelect',
  args: { value: 'mainnet', onValueChange: fn() },
  render: (args) => <Controlled {...args} />,
};
export default meta;

type Story = StoryObj<typeof NetworkSelect>;

export const Mainnet: Story = {};

export const Testnet: Story = { args: { value: 'testnet' } };

export const Pending: Story = { args: { value: 'testnet', pending: true } };

export const Disabled: Story = { args: { disabled: true } };

export const SwitchToTestnet: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole('combobox', { name: 'Network' });
    await userEvent.click(trigger);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole('option', { name: 'testnet' }));
    await expect(args.onValueChange).toHaveBeenCalledWith('testnet');
    await waitFor(() => expect(trigger).toHaveTextContent('testnet'));
  },
};
