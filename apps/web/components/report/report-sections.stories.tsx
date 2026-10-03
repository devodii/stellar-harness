import type { Meta, StoryObj } from '@storybook/nextjs-vite';
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

export const Headline: Story = { render: () => <HeadlineSection report={REPORT_FIXTURE} /> };
export const Failures: Story = { render: () => <FailuresSection report={REPORT_FIXTURE} /> };
export const Contracts: Story = { render: () => <ContractsSection report={REPORT_FIXTURE} /> };
export const Anchors: Story = { render: () => <AnchorsSection report={REPORT_FIXTURE} /> };
export const Rent: Story = { render: () => <RentSection report={REPORT_FIXTURE} /> };
export const Signals: Story = { render: () => <SignalsSection report={REPORT_FIXTURE} /> };
export const SignalsEmpty: Story = {
  render: () => (
    <SignalsSection
      report={{ ...REPORT_FIXTURE, csv: { ...REPORT_FIXTURE.csv, 'github_issues.csv': [] } }}
    />
  ),
};
export const Methodology: Story = { render: () => <MethodologySection report={REPORT_FIXTURE} /> };
export const Downloads: Story = { render: () => <DownloadsSection report={REPORT_FIXTURE} /> };
