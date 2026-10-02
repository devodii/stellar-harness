import type { Finding, PreventableCode } from '@harness/schema';
import { evidenceNumber, evidenceString, sampleTxHash } from '../evidence';
import { handoff, type Recipe, read, type StepDraft, simulate } from '../step';

export const CHANNEL_STARTING_BALANCE_XLM = 1.5;
export const MIN_CHANNELS = 2;
export const MAX_CHANNELS = 10;

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

const clusterRecipe =
  (
    title: (account: string) => string,
    code: PreventableCode,
    summary: string,
    withPreflight = false,
  ): Recipe =>
  (finding) => ({
    title: title(finding.subject),
    steps: [
      readAccount(finding),
      readSample(finding, code),
      ...(withPreflight ? preflight(finding) : []),
    ],
    handoff: handoff('account_signer', summary),
  });

export const TX_RECIPES = {
  TX_BAD_SEQ_CLUSTER: (finding) => {
    const channels = channelCount(finding);
    return {
      title: `Provision channel accounts for ${finding.subject}`,
      steps: [readAccount(finding), readSample(finding, 'tx_bad_seq'), readCluster(finding)],
      handoff: handoff(
        'account_signer',
        `The account signers create ${channels} channel accounts (${CHANNEL_STARTING_BALANCE_XLM} XLM starting balance each) and send one in-flight transaction per channel.`,
      ),
    };
  },
  TX_INSUFFICIENT_FEE_CLUSTER: clusterRecipe(
    (account) => `Set fee bidding for ${account}`,
    'tx_insufficient_fee',
    'The account signers bid fees from recent surge pricing and wrap retries in a fee bump signed by the fee source.',
  ),
  TX_TOO_LATE_CLUSTER: clusterRecipe(
    (account) => `Fix timebounds for ${account}`,
    'tx_too_late',
    'The account signers set the max time bound after signatures are collected and fee-bump transactions that queue.',
  ),
  TX_BAD_AUTH_CLUSTER: clusterRecipe(
    (account) => `Fix signing for ${account}`,
    'tx_bad_auth',
    'The account signers collect signatures whose weights meet the account thresholds before each transaction is sent.',
  ),
  OP_NO_TRUST_CLUSTER: clusterRecipe(
    (account) => `Pre-flight trustlines for payments from ${account}`,
    'op_no_trust',
    'The sending account checks the destination trustline before every payment; only the destination can add it with change_trust.',
    true,
  ),
  OP_UNDERFUNDED_CLUSTER: clusterRecipe(
    (account) => `Monitor float for ${account}`,
    'op_underfunded',
    'The account signers set a per-asset float alert and rebalance from treasury before balances run short.',
  ),
  OP_NO_DESTINATION_CLUSTER: clusterRecipe(
    (account) => `Pre-flight destinations for ${account}`,
    'op_no_destination',
    'The sending account checks the destination exists before paying, and funds it with create_account (1 XLM minimum) or holds the payment.',
    true,
  ),
  OP_LOW_RESERVE_CLUSTER: (finding) => {
    const shortfallXlm = evidenceNumber(finding.evidence, 'reserveShortfallXlm', 'shortfallXlm');
    return {
      title: `Top up the XLM reserve on ${finding.subject}`,
      steps: [readAccount(finding), readSample(finding, 'op_low_reserve')],
      handoff: handoff(
        'account_signer',
        'The account signers keep enough XLM above the minimum balance (0.5 XLM per subentry) so operations stop failing on reserve.',
        shortfallXlm,
      ),
    };
  },
  OP_LINE_FULL_CLUSTER: clusterRecipe(
    (account) => `Pre-flight trustline limits for ${account}`,
    'op_line_full',
    'The sending account compares each amount with the destination trustline limit and splits or holds the payment; only the destination can raise its limit.',
  ),
} satisfies Record<string, Recipe>;
