import { appError, err, ok } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { PilotForm, PilotSheet } from './pilot-sheet';

const meta: Meta<typeof PilotForm> = {
  component: PilotForm,
  title: 'components/PilotSheet',
  args: { requestPilot: fn(async () => ok({ count: 12 })) },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PilotForm>;

export const Form: Story = {};

export const Submits: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('email'), 'ops@example.org');
    await userEvent.click(canvas.getByRole('button', { name: 'request a pilot' }));
    await expect(args.requestPilot).toHaveBeenCalledWith({ email: 'ops@example.org' });
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'Request received, 12 organisations are waiting.',
    );
  },
};

export const RejectsInvalidEmail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('email'), 'not-an-email');
    await userEvent.click(canvas.getByRole('button', { name: 'request a pilot' }));
    await expect(canvas.getByLabelText('email')).toHaveAttribute('aria-invalid', 'true');
    await expect(args.requestPilot).not.toHaveBeenCalled();
  },
};

export const ServerError: Story = {
  args: { requestPilot: fn(async () => err(appError('RATE_LIMITED', 'Too many requests'))) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('email'), 'ops@example.org');
    await userEvent.click(canvas.getByRole('button', { name: 'request a pilot' }));
    await expect(await canvas.findByText('Too many requests')).toBeVisible();
  },
};

export const Sheet: Story = {
  render: (args) => <PilotSheet requestPilot={args.requestPilot} />,
  play: async ({ canvasElement }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'request a pilot' }));
    await expect(await within(document.body).findByLabelText('email')).toBeVisible();
  },
};
