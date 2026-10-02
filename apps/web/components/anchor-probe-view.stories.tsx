import { SUGGESTED_ACTION } from '@harness/schema';
import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { AnchorProbeView as AnchorProbeData } from '@/lib/tool-views';
import { AnchorProbeView } from './anchor-probe-view';

const PROBE: AnchorProbeData = {
  domain: 'anchor.example.org',
  stages: [
    { stage: 'toml', ok: true, status: 200, ms: 312, error: null },
    { stage: 'accounts', ok: true, status: 200, ms: 140, error: null },
    { stage: 'endpoints', ok: true, status: null, ms: 0, error: null },
    {
      stage: 'info',
      ok: false,
      status: null,
      ms: 15000,
      error: 'getaddrinfo ENOTFOUND transfer.example.invalid',
    },
  ],
  findings: [
    {
      findingId: 'a'.repeat(64),
      type: 'ANCHOR_INFO_UNREADABLE',
      subjectKind: 'anchor_domain',
      subject: 'anchor.example.org',
      severity: 'critical',
      evidence: { stage: 'info' },
      suggestedAction: SUGGESTED_ACTION.ANCHOR_INFO_UNREADABLE,
      snapshotLedger: 1000001,
      observedAt: '2026-01-01T00:00:00.000Z',
      tags: ['anchor'],
    },
  ],
  toml: {
    signingKey: 'GFAKESIGNINGKEYFORSTORYBOOK00000000000000000000000000SK',
    accounts: ['GFAKEACCOUNTFORSTORYBOOK0000000000000000000000000000ACC'],
    currencies: [
      { code: 'USDX', issuer: 'GFAKEISSUERFORSTORYBOOK00000000000000000000000000000ISS' },
    ],
    endpoints: {
      transferServer: 'https://transfer.example.invalid/sep6',
      transferServerSep24: 'https://transfer.example.invalid/sep24',
      directPaymentServer: null,
      anchorQuoteServer: null,
      webAuthEndpoint: 'https://auth.example.invalid',
      kycServer: null,
    },
    networkPassphrase: 'Public Global Stellar Network ; September 2015',
    version: '2.0.0',
  },
};

const meta: Meta<typeof AnchorProbeView> = {
  component: AnchorProbeView,
  title: 'renderers/AnchorProbeView',
  args: { probe: PROBE },
};
export default meta;

type Story = StoryObj<typeof AnchorProbeView>;

export const FailsAtInfo: Story = {};

export const Conformant: Story = {
  args: {
    probe: {
      ...PROBE,
      stages: PROBE.stages.map((stage) => ({
        ...stage,
        ok: true,
        status: 200,
        error: null,
        ms: 120,
      })),
      findings: [],
      anchorTests: { perSep: { sep1: { passed: 6, failed: 0, names: [] } } },
    },
  },
};

export const TomlUnreachable: Story = {
  args: {
    probe: {
      ...PROBE,
      stages: [{ stage: 'toml', ok: false, status: 404, ms: 210, error: 'HTTP 404' }],
      toml: null,
      findings: [],
    },
  },
};
