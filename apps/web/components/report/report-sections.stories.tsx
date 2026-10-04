import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { expect, userEvent, within } from 'storybook/test';
import { buildReportView } from '@/lib/report-view';
import { AnchorsSection } from './anchors';
import { ContractsSection } from './contracts';
import { DownloadsSection } from './downloads';
import { FailuresSection } from './failures';
import { REPORT_FIXTURE } from './fixture';
import { HeadlineSection } from './headline';
import { MethodologySection } from './methodology';
import { RentSection } from './rent';
import { SignalsSection } from './signals';

const meta: Meta = { title: 'report/Sections' };
export default meta;

type Story = StoryObj;

const VIEW = buildReportView(REPORT_FIXTURE);

export const Headline: Story = { render: () => <HeadlineSection headlines={VIEW.headlines} /> };
export const Failures: Story = { render: () => <FailuresSection failures={VIEW.failures} /> };
export const Contracts: Story = { render: () => <ContractsSection contracts={VIEW.contracts} /> };
export const Anchors: Story = { render: () => <AnchorsSection anchors={VIEW.anchors} /> };
export const Rent: Story = { render: () => <RentSection rent={VIEW.rent} /> };
export const Signals: Story = { render: () => <SignalsSection issues={VIEW.issues} /> };
export const SignalsEmpty: Story = { render: () => <SignalsSection issues={[]} /> };
export const Methodology: Story = { render: () => <MethodologySection methods={VIEW.methods} /> };
export const Downloads: Story = { render: () => <DownloadsSection files={VIEW.files} /> };

export const PaginatesTenRows: Story = {
  render: () => (
    <ContractsSection
      contracts={{
        ...VIEW.contracts,
        archived: Array.from({ length: 23 }, (_, index) => ({
          ...(VIEW.contracts.archived[0] as (typeof VIEW.contracts.archived)[number]),
          contract: `C${String(index).padStart(55, 'A')}`,
        })),
      }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('page 1 of 3, 23 rows')).toBeInTheDocument();
    await userEvent.click(canvas.getAllByRole('button', { name: 'Next' })[0] as HTMLElement);
    await expect(canvas.getByText('page 2 of 3, 23 rows')).toBeInTheDocument();
  },
};
