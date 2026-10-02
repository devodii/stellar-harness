import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { FailureExplanationView as FailureExplanationData } from '@/lib/tool-views';
import { FailureExplanationView } from './failure-explanation-view';

const EXPLANATION: FailureExplanationData = {
  codes: { tx: 'tx_failed', ops: ['op_no_trust'] },
  explanation:
    'Operation 1 of 1 failed with op_no_trust: the destination has no trustline for the asset.',
  preventable: true,
  suggestedAction:
    'Pre-flight trustline check; sponsor the trustline (CAP-33) or route via claimable balance.',
  perCode: [
    {
      code: 'tx_failed',
      title: 'Transaction failed',
      explanation: 'One or more operations failed.',
    },
    {
      code: 'op_no_trust',
      title: 'No trustline',
      explanation: 'The destination account does not trust the asset being sent.',
    },
  ],
};

const meta: Meta<typeof FailureExplanationView> = {
  component: FailureExplanationView,
  title: 'renderers/FailureExplanationView',
  args: { explanation: EXPLANATION },
};
export default meta;

type Story = StoryObj<typeof FailureExplanationView>;

export const Preventable: Story = {};

export const NotPreventable: Story = {
  args: {
    explanation: {
      ...EXPLANATION,
      codes: { tx: 'tx_failed', ops: ['op_over_source_max'] },
      explanation:
        'Operation 1 of 1 failed with op_over_source_max: the path cost more than allowed.',
      preventable: false,
      suggestedAction: 'Requote the path and retry with a wider send max.',
      perCode: [],
    },
  },
};
