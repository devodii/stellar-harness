import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { ToolErrorRow } from './tool-error-row';

const meta: Meta<typeof ToolErrorRow> = {
  component: ToolErrorRow,
  title: 'renderers/ToolErrorRow',
  args: { code: 'UPSTREAM_TIMEOUT', message: 'Horizon did not answer within 15s.' },
};
export default meta;

type Story = StoryObj<typeof ToolErrorRow>;

export const WithCode: Story = {};

export const MessageOnly: Story = { args: { code: undefined, message: 'Tool execution failed.' } };

export const LongMessage: Story = {
  args: {
    code: 'INVALID_INPUT',
    message:
      'Expected a 64 character hex hash, received something considerably longer than the column can show.',
  },
};
