import type { Finding, PreventableCode } from '@harness/schema';
import { evidenceNumber, evidenceString, sampleTxHash } from '../evidence';
import { build, notice, type Recipe, read, type StepDraft, simulate, submit } from '../step';

export const CHANNEL_STARTING_BALANCE_XLM = 1.5;
export const MIN_CHANNELS = 2;
export const MAX_CHANNELS = 10;
export const RESERVE_TOP_UP_XLM = 2;

const readAccount = (finding: Finding) =>
  read('getAccount', 'Read the source account: sequence, balances, thresholds and signers.', {
    address: finding.subject,
  });

const readSample = (finding: Finding, code: PreventableCode): StepDraft => {
  const hash = sampleTxHash(finding);
  if (hash) {
    return read('getTransaction', 'Read a failed transaction from the cluster.', { hash });
  }
  return read('explainFailure', `Explain ${code} for the cluster.`, {
    codes: {
      tx: code.startsWith('tx_') ? code : 'tx_failed',
      ops: code.startsWith('op_') ? [code] : [],
    },
  });
};

const readCluster = (finding: Finding) =>
  read('queryFindings', 'List every failure cluster on this account.', {
    subject: finding.subject,
  });

const preflight = (finding: Finding): StepDraft[] => {
  const to = evidenceString(finding.evidence, 'topDestination', 'destination', 'destinations');
  const asset = evidenceString(finding.evidence, 'asset', 'topAsset', 'assets');
  if (!to || !asset) return [];
  const amount = evidenceString(finding.evidence, 'sampleAmount', 'amount') ?? '1';
  return [
    simulate('buildPaymentPreflight', 'Pre-flight the most common failing payment.', {
      from: finding.subject,
      to,
      asset,
      amount,
    }),
  ];
};

export const channelCount = (finding: Finding): number => {
  const collisions = evidenceNumber(finding.evidence, 'sameLedgerCollisions') ?? 0;
  return Math.min(MAX_CHANNELS, Math.max(MIN_CHANNELS, Math.ceil(collisions / 10)));
};

const configNotice = (finding: Finding, change: string) =>
  notice(change, { account: finding.subject, fix: finding.suggestedAction });

export const TX_RECIPES = {
  TX_BAD_SEQ_CLUSTER: (finding) => {
    const channels = channelCount(finding);
    return {
      title: `Provision channel accounts for ${finding.subject}`,
      estimatedCostXlm: channels * CHANNEL_STARTING_BALANCE_XLM,
      steps: [
        readAccount(finding),
        readSample(finding, 'tx_bad_seq'),
        readCluster(finding),
        build(
          'Build a channel pool config: one in-flight transaction per channel, serialized per source.',
          {
            operation: 'channelPool',
            source: finding.subject,
            channels,
          },
        ),
        build(
          `Build create_account operations for ${channels} channel accounts funded by the source.`,
          {
            operation: 'createAccount',
            funder: finding.subject,
            count: channels,
            startingBalanceXlm: CHANNEL_STARTING_BALANCE_XLM,
          },
        ),
        submit('Submit the channel account creation once the policy owner approves and signs.'),
      ],
    };
  },
  TX_INSUFFICIENT_FEE_CLUSTER: (finding) => ({
    title: `Set a fee policy for ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'tx_insufficient_fee'),
      build('Build a fee-bump template the account can wrap retries in, capped by policy.', {
        operation: 'feeBump',
        feeSource: finding.subject,
      }),
      configNotice(finding, 'Draft a fee policy: bid from recent surge fees, fee-bump on retry.'),
    ],
  }),
  TX_TOO_LATE_CLUSTER: (finding) => ({
    title: `Fix timebounds for ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'tx_too_late'),
      configNotice(
        finding,
        'Draft a timebound policy: set max time after signatures are collected, fee-bump if queued.',
      ),
    ],
  }),
  TX_BAD_AUTH_CLUSTER: (finding) => ({
    title: `Fix signing for ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'tx_bad_auth'),
      configNotice(
        finding,
        'Draft a signing checklist: required signers and weights against the account thresholds.',
      ),
    ],
  }),
  OP_NO_TRUST_CLUSTER: (finding) => ({
    title: `Pre-flight trustlines for payments from ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'op_no_trust'),
      ...preflight(finding),
      configNotice(
        finding,
        'Draft a pre-flight rule: check the destination trustline before every payment.',
      ),
    ],
  }),
  OP_UNDERFUNDED_CLUSTER: (finding) => ({
    title: `Monitor float for ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'op_underfunded'),
      configNotice(
        finding,
        'Draft a float alert: threshold per asset and a treasury rebalance rule.',
      ),
    ],
  }),
  OP_NO_DESTINATION_CLUSTER: (finding) => ({
    title: `Pre-flight destinations for ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'op_no_destination'),
      ...preflight(finding),
      configNotice(
        finding,
        'Draft a pre-flight rule: check the destination exists, create and fund it under policy or hold.',
      ),
    ],
  }),
  OP_LOW_RESERVE_CLUSTER: (finding) => {
    const topUpXlm =
      evidenceNumber(finding.evidence, 'reserveShortfallXlm', 'shortfallXlm') ?? RESERVE_TOP_UP_XLM;
    return {
      title: `Top up the XLM reserve on ${finding.subject}`,
      estimatedCostXlm: topUpXlm,
      steps: [
        readAccount(finding),
        readSample(finding, 'op_low_reserve'),
        build(`Build a ${topUpXlm} XLM payment to ${finding.subject} from the treasury.`, {
          operation: 'payment',
          to: finding.subject,
          asset: 'XLM',
          amount: String(topUpXlm),
        }),
        submit('Submit the top-up once the policy owner approves and signs.'),
      ],
    };
  },
  OP_LINE_FULL_CLUSTER: (finding) => ({
    title: `Pre-flight trustline limits for ${finding.subject}`,
    steps: [
      readAccount(finding),
      readSample(finding, 'op_line_full'),
      configNotice(
        finding,
        'Draft a pre-flight rule: compare amount with the destination trustline limit, split or hold.',
      ),
    ],
  }),
} satisfies Record<string, Recipe>;
