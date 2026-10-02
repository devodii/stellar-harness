import { ok, ROADMAP_NOTE } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { HANDOFF_HINT } from '@/lib/plan-copy';
import { ConnectSheetProvider } from './connect-sheet';
import { HandoffBlock } from './handoff-block';

const meta: Meta<typeof HandoffBlock> = {
  component: HandoffBlock,
  title: 'components/HandoffBlock',
  args: {
    handoff: {
      summary:
        'Anyone can pay to extend the instance and wasm TTL by 365 days; the contract admin decides whether it is worth keeping.',
      requiredAuthority: 'any_payer',
      estimatedCostXlm: 1.8350421,
      roadmapNote: ROADMAP_NOTE,
    },
  },
  decorators: [
    (Story) => (
      <ConnectSheetProvider requestPilot={fn(async () => ok({ count: 4 }))}>
        <div className="max-w-xl">
          <Story />
        </div>
      </ConnectSheetProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof HandoffBlock>;

export const AnyPayer: Story = {};

export const WithoutCost: Story = {
  args: {
    handoff: {
      summary: 'The anchor operator must serve a valid stellar.toml with a SIGNING_KEY.',
      requiredAuthority: 'anchor_operator',
      roadmapNote: ROADMAP_NOTE,
    },
  },
};

export const ExplainsAndConnects: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(document.body);
    await expect(canvas.getByText('[any_payer]')).toBeVisible();
    await expect(canvas.getByText(ROADMAP_NOTE)).toBeVisible();
    await userEvent.hover(canvas.getByRole('region', { name: 'handoff' }));
    await expect(await page.findByRole('tooltip')).toHaveTextContent(HANDOFF_HINT);
    await userEvent.click(canvas.getByRole('button', { name: 'connect organisation' }));
    await expect(await page.findByText('Connect your organisation')).toBeVisible();
  },
};
