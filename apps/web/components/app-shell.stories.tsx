import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { AppShell } from './app-shell';
import { AppSidebarView } from './app-sidebar';
import { LiveStrip } from './live-strip';
import { PageHeader } from './page-header';
import { ThemeProvider } from './theme-provider';

const meta: Meta<typeof AppShell> = {
  component: AppShell,
  title: 'shell/AppShell',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <ThemeProvider attribute="class">
      <AppShell
        sidebar={
          <AppSidebarView
            pathname="/findings"
            conversations={[
              { id: 'a', title: 'Synthetic chat', updatedAt: '2026-01-01T00:00:00Z' },
            ]}
            activeId={null}
            onNewChat={fn()}
            onDelete={fn()}
          />
        }
        strip={<LiveStrip live items={[{ id: 'ledger', label: 'ledger', value: 1000001 }]} />}
      >
        <div className="px-6">
          <PageHeader title="Findings" description="Synthetic page content inside the shell." />
        </div>
      </AppShell>
    </ThemeProvider>
  ),
};
export default meta;

type Story = StoryObj<typeof AppShell>;

export const Default: Story = {};
