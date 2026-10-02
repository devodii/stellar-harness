import { appError, err, ok } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { ConnectForm } from './connect-form';

const meta: Meta<typeof ConnectForm> = {
  component: ConnectForm,
  title: 'components/ConnectForm',
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

type Story = StoryObj<typeof ConnectForm>;

export const Default: Story = {};

export const Submits: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('email'), 'ops@example.org');
    await userEvent.click(canvas.getByRole('button', { name: 'request pilot' }));
    await expect(args.requestPilot).toHaveBeenCalledWith({ email: 'ops@example.org' });
    await expect(await canvas.findByRole('status')).toHaveTextContent(
      'request received · 12 organisations waiting',
    );
  },
};

export const RejectsInvalidEmail: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('email'), 'not-an-email');
    await userEvent.click(canvas.getByRole('button', { name: 'request pilot' }));
    await expect(canvas.getByLabelText('email')).toHaveAttribute('aria-invalid', 'true');
    await expect(args.requestPilot).not.toHaveBeenCalled();
  },
};

export const ServerError: Story = {
  args: {
    requestPilot: fn(async () => err(appError('RATE_LIMITED', 'Too many requests'))),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(canvas.getByLabelText('email'), 'ops@example.org');
    await userEvent.click(canvas.getByRole('button', { name: 'request pilot' }));
    await expect(await canvas.findByText('Too many requests')).toBeVisible();
  },
};
