import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { PageHeader } from './page-header';
import { Button } from './ui/button';

const meta: Meta<typeof PageHeader> = {
  component: PageHeader,
  title: 'components/PageHeader',
  args: { title: 'Findings' },
};
export default meta;

type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {};

export const WithDescription: Story = {
  args: { description: 'Every finding the scanner emitted, newest snapshot first.' },
};

export const WithActions: Story = {
  args: {
    description: 'Every finding the scanner emitted.',
    actions: (
      <Button type="button" variant="outline" size="sm">
        Export
      </Button>
    ),
  },
};
