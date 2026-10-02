import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { Container } from './container';

const meta: Meta<typeof Container> = {
  component: Container,
  title: 'components/Container',
  render: (args) => (
    <Container {...args}>
      <div className="rounded-md border border-border bg-card p-4 text-sm">Content</div>
    </Container>
  ),
};
export default meta;

type Story = StoryObj<typeof Container>;

export const Small: Story = { args: { size: 'sm' } };
export const Medium: Story = { args: { size: 'md' } };
export const Large: Story = { args: { size: 'lg' } };
export const Full: Story = { args: { size: 'full' } };
