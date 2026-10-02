import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { Watch } from '@/lib/harness';
import { fakeAccount, fakeContract, fakeHash } from './story-ids';
import { WatchPanel } from './watch-panel';

const ttl = (daysLeft: number, archived = false) => ({
  contractId: fakeContract('escrow'),
  latestLedger: 4_990_627,
  wasmHash: fakeHash(1),
  instance: { liveUntilLedger: archived ? null : 5_111_510, daysLeft, archived },
  code: { liveUntilLedger: 5_111_509, daysLeft, archived },
});

const WATCH: Watch = {
  accounts: [
    { address: fakeAccount('treasury'), label: 'Treasury', role: 'treasury', xlm: '9893.9109013' },
    {
      address: fakeAccount('distribution'),
      label: 'Distribution',
      role: 'distribution',
      xlm: '10000',
    },
  ],
  contracts: [
    { id: fakeContract('escrow'), label: 'Escrow', ttl: ttl(6.9) },
    { id: fakeContract('registry'), label: 'Registry', ttl: ttl(0, true) },
  ],
  anchor: {
    domain: 'testanchor.stellar.org',
    stages: [
      { name: 'toml', status: 'ok', detail: '' },
      { name: 'signing key', status: 'ok', detail: '' },
      { name: '/info', status: 'ok', detail: '' },
      { name: 'sep-10', status: 'ok', detail: '' },
    ],
  },
  actions: [
    {
      id: 'a1',
      subject: fakeContract('escrow'),
      title: 'Extend Escrow TTL to 365 days',
      why: 'Escrow has 6.9 days left.',
      operation: 'extend_ttl',
      estimatedCostXlm: 27.31,
      withinPolicy: false,
      status: 'proposed',
    },
  ],
};

const meta: Meta<typeof WatchPanel> = {
  component: WatchPanel,
  title: 'components/WatchPanel',
  args: { watch: WATCH, network: 'testnet', anchorDomain: 'testanchor.stellar.org' },
  decorators: [
    (Story) => (
      <div className="flex h-[720px]">
        <Story />
      </div>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof WatchPanel>;

export const Default: Story = {};

export const NothingProposed: Story = { args: { watch: { ...WATCH, actions: [] } } };

export const AnchorFailing: Story = {
  args: {
    watch: {
      ...WATCH,
      anchor: {
        domain: 'testanchor.stellar.org',
        stages: [
          { name: 'toml', status: 'ok', detail: '' },
          { name: '/info', status: 'fail', detail: 'HTTP 503' },
        ],
      },
    },
  },
};

export const ReadsUnavailable: Story = {
  args: {
    watch: {
      ...WATCH,
      accounts: WATCH.accounts.map((account) => ({ ...account, xlm: null })),
      contracts: WATCH.contracts.map((contract) => ({ ...contract, ttl: null })),
      anchor: null,
    },
  },
};
