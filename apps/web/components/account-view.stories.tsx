import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { AccountView as AccountViewData } from '@/lib/tool-views';
import { AccountView } from './account-view';

const FAKE_ISSUER = 'GFAKEISSUERFORSTORYBOOK00000000000000000000000000000ISS';

const ACCOUNT: AccountViewData = {
  address: 'GFAKEACCOUNTFORSTORYBOOK0000000000000000000000000000ACC',
  exists: true,
  sequence: '123456789012',
  balances: [
    { asset: 'XLM', balance: '1520.1234567' },
    { asset: `USDX:${FAKE_ISSUER}`, balance: '250.0000000', limit: '922337203685.4775807' },
  ],
  thresholds: { low: 0, med: 2, high: 2 },
  signers: [
    { key: 'GFAKESIGNERONE0000000000000000000000000000000000000001', weight: 1 },
    { key: 'GFAKESIGNERTWO0000000000000000000000000000000000000002', weight: 1 },
  ],
  flags: {
    authRequired: true,
    authRevocable: true,
    authImmutable: false,
    authClawbackEnabled: false,
  },
  homeDomain: 'example.org',
  subentryCount: 4,
  numSponsoring: 0,
  numSponsored: 1,
};

const meta: Meta<typeof AccountView> = {
  component: AccountView,
  title: 'renderers/AccountView',
  args: { account: ACCOUNT },
};
export default meta;

type Story = StoryObj<typeof AccountView>;

export const Multisig: Story = {};

export const Missing: Story = {
  args: {
    account: {
      ...ACCOUNT,
      exists: false,
      sequence: null,
      balances: [],
      signers: [],
      homeDomain: null,
      flags: {
        authRequired: false,
        authRevocable: false,
        authImmutable: false,
        authClawbackEnabled: false,
      },
    },
  },
};
