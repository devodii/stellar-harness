import { ok } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import * as React from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';
import { CONNECT_BODY, CONNECT_TITLE } from './connect-form';
import { ConnectButton, ConnectSheet, ConnectSheetProvider } from './connect-sheet';

const requestPilot = fn(async () => ok({ count: 7 }));

function OpenSheet() {
  const [open, setOpen] = React.useState(true);
  return <ConnectSheet open={open} onOpenChange={setOpen} requestPilot={requestPilot} />;
}

const meta: Meta<typeof ConnectSheet> = {
  component: ConnectSheet,
  title: 'components/ConnectSheet',
};
export default meta;

type Story = StoryObj<typeof ConnectSheet>;

export const Open: Story = { render: () => <OpenSheet /> };

export const Mobile: Story = {
  render: () => <OpenSheet />,
  globals: { viewport: { value: 'mobile1', isRotated: false } },
};

export const FromButtons: Story = {
  render: () => (
    <ConnectSheetProvider requestPilot={requestPilot}>
      <div className="flex items-center gap-4">
        <ConnectButton />
        <ConnectButton variant="inline" />
      </div>
    </ConnectSheetProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    const [barButton] = canvas.getAllByRole('button', { name: 'connect organisation' });
    if (!barButton) throw new Error('missing connect button');
    await userEvent.click(barButton);
    await expect(await page.findByText(CONNECT_TITLE)).toBeVisible();
    await expect(page.getByText(CONNECT_BODY)).toBeVisible();
    await userEvent.type(page.getByLabelText('email'), 'ops@example.org');
    await userEvent.click(page.getByRole('button', { name: 'request pilot' }));
    await expect(await page.findByRole('status')).toHaveTextContent(
      'request received · 7 organisations waiting',
    );
  },
};
