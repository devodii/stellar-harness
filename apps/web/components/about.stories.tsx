import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, within } from 'storybook/test';
import { ABOUT_DEMO_LINE, ABOUT_SECTIONS, About } from './about';

const meta: Meta<typeof About> = {
  component: About,
  title: 'components/About',
  decorators: [
    (Story) => (
      <div className="max-w-4xl text-sm">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof About>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(ABOUT_DEMO_LINE)).toBeVisible();
    const headings = canvas.getAllByRole('heading', { level: 2 });
    await expect(headings.map((heading) => heading.textContent)).toEqual(
      ABOUT_SECTIONS.map((section) => section.title),
    );
    await expect(canvas.getByRole('link', { name: 'See the mainnet report' })).toHaveAttribute(
      'href',
      '/report',
    );
  },
};
