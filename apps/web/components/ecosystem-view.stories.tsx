import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { EcosystemView as EcosystemData } from '@/lib/tool-views';
import { EcosystemView } from './ecosystem-view';

const ECOSYSTEM: EcosystemData = {
  query: 'lending',
  projects: [
    {
      slug: 'example-lend',
      name: 'Example Lend',
      description: 'A synthetic lending protocol used only in this story.',
      website: 'https://example.org',
      scfAwarded: true,
      scfRound: 42,
      contracts: ['CFAKECONTRACTFORSTORYBOOK0000000000000000000000000000ABC'],
    },
    {
      slug: 'other-project',
      name: 'Other Project',
      description: null,
      website: null,
      scfAwarded: false,
      scfRound: null,
      contracts: [],
    },
  ],
  repos: [
    {
      name: 'example/lend-contracts',
      url: 'https://example.org/repo',
      description: null,
      score: 64,
      mainnetContractId: null,
    },
  ],
};

const meta: Meta<typeof EcosystemView> = {
  component: EcosystemView,
  title: 'renderers/EcosystemView',
  args: { ecosystem: ECOSYSTEM },
};
export default meta;

type Story = StoryObj<typeof EcosystemView>;

export const Results: Story = {};

export const NoMatches: Story = {
  args: { ecosystem: { query: 'nothing', projects: [], repos: [] } },
};
