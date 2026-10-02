import { ok } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { formatPercent, formatSeconds } from '@/lib/format';
import { BracketTag } from './bracket-tag';
import { ConnectSheetProvider } from './connect-sheet';
import { LiveStrip } from './live-strip';
import { ThemeProvider } from './theme-provider';
import { TopBar } from './top-bar';
import { SidebarProvider } from './ui/sidebar';

const STRIP = (
  <LiveStrip
    live
    items={[
      { id: 'ledger', label: 'ledger', value: 1000001 },
      { id: 'close', label: 'close', value: 5.9, format: formatSeconds },
      { id: 'failed', label: 'failed 7d', value: 120345, tone: 'destructive' },
      { id: 'prev', label: 'preventable', value: 0.41, format: (n) => formatPercent(n) },
    ]}
  />
);

const meta: Meta<typeof TopBar> = {
  component: TopBar,
  title: 'shell/TopBar',
  args: { strip: STRIP },
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class">
        <ConnectSheetProvider requestPilot={fn(async () => ok({ count: 3 }))}>
          <SidebarProvider className="min-h-0">
            <div className="w-full">
              <Story />
            </div>
          </SidebarProvider>
        </ConnectSheetProvider>
      </ThemeProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof TopBar>;

export const WithLiveStrip: Story = {};

export const Empty: Story = { args: { strip: undefined } };

export const OnTestnet: Story = {
  args: { badge: <BracketTag label="testnet" tone="warning" /> },
};

export const OpensConnectSheet: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: 'connect organisation' }));
    await expect(await within(document.body).findByText('Connect your organisation')).toBeVisible();
  },
};
