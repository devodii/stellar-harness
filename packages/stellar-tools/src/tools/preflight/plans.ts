import {
  DEFAULT_NETWORK,
  type Network,
  Plan,
  type PlanStep,
  type PlanStepKind,
} from '@harness/schema';
import { DEFAULT_SPEND_CAP_XLM, evaluatePolicy, type Policy } from '../../plan/policy';
import { formatStroops, toStroops } from '../amount';
import { assetId, type ParsedAsset } from '../assets';
import { BASE_RESERVE_STROOPS } from '../reserve';
import { MIN_CREATE_ACCOUNT_STROOPS, type PreflightCode } from './checks';

export type AlternativeKind = 'sponsored_trustline' | 'claimable_balance' | 'create_account';

export type AlternativeInput = {
  from: string;
  to: string;
  asset: ParsedAsset;
  amount: string;
  blockers: PreflightCode[];
  policy?: Policy;
  network?: Network;
};

const DEFAULT_POLICY: Policy = { spendCapXlm: DEFAULT_SPEND_CAP_XLM };

const SOURCE_SIDE: ReadonlySet<PreflightCode> = new Set([
  'tx_no_source_account',
  'op_src_no_trust',
  'op_underfunded',
  'op_low_reserve',
  'tx_insufficient_balance',
]);

const RESERVE_XLM = Number(formatStroops(BASE_RESERVE_STROOPS));

export const chooseAlternative = (input: AlternativeInput): AlternativeKind | null => {
  const { blockers, asset, amount } = input;
  if (blockers.length === 0 || blockers.some((code) => SOURCE_SIDE.has(code))) return null;
  if (blockers.includes('op_no_destination')) {
    if (!asset.native) return 'claimable_balance';
    return toStroops(amount) >= MIN_CREATE_ACCOUNT_STROOPS ? 'create_account' : null;
  }
  if (blockers.includes('op_no_trust')) return 'sponsored_trustline';
  if (blockers.includes('op_not_authorized') || blockers.includes('op_line_full')) {
    return 'claimable_balance';
  }
  return null;
};

type StepDraft = Omit<PlanStep, 'id' | 'status'> & { status?: PlanStep['status'] };

const step = (
  kind: PlanStepKind,
  tool: string,
  description: string,
  args: Record<string, unknown>,
): StepDraft => ({ kind, tool, description, args });

const submitStep = (input: AlternativeInput, description: string, signers: string[]): StepDraft =>
  step('submit', 'submitTransaction', description, {
    network: input.network ?? DEFAULT_NETWORK,
    signers,
  });

const stableId = (parts: string[]): string => {
  let hash = 0x811c9dc5;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const finalize = (
  input: AlternativeInput,
  kind: AlternativeKind,
  title: string,
  drafts: StepDraft[],
  estimatedCostXlm?: number,
): Plan => {
  const steps: PlanStep[] = drafts.map((draft, index) => {
    const id = `s${index + 1}`;
    const previousBuild = drafts.slice(0, index).findLastIndex((d) => d.kind === 'build');
    const args =
      draft.kind === 'submit' && previousBuild >= 0
        ? { fromStep: `s${previousBuild + 1}`, ...draft.args }
        : draft.args;
    return { ...draft, id, args, status: draft.status ?? 'pending' };
  });
  const costed = estimatedCostXlm !== undefined ? { estimatedCostXlm } : {};
  return Plan.parse({
    planId: `preflight-${kind}-${stableId([input.from, input.to, assetId(input.asset), input.amount])}`,
    title,
    subject: input.to,
    steps,
    ...costed,
    ...evaluatePolicy({ steps, ...costed }, input.policy ?? DEFAULT_POLICY),
  });
};

const assetLabel = (asset: ParsedAsset) => (asset.native ? 'XLM' : asset.code);

const paymentSteps = (input: AlternativeInput): StepDraft[] => [
  step(
    'build',
    'buildTransaction',
    `Build the ${input.amount} ${assetLabel(input.asset)} payment.`,
    {
      source: input.from,
      operations: [
        {
          type: 'payment',
          destination: input.to,
          asset: assetId(input.asset),
          amount: input.amount,
        },
      ],
    },
  ),
  submitStep(input, 'Submit the payment once the policy owner approves and signs.', [input.from]),
];

const sponsoredTrustline = (input: AlternativeInput): Plan => {
  const asset = assetId(input.asset);
  return finalize(
    input,
    'sponsored_trustline',
    `Sponsor a ${assetLabel(input.asset)} trustline for ${input.to}, then pay`,
    [
      step('read', 'getAccount', 'Read the destination account and its trustlines.', {
        address: input.to,
      }),
      step(
        'build',
        'buildTransaction',
        `Build a CAP-33 sponsored trustline: ${input.from} pays the ${RESERVE_XLM} XLM reserve, ${input.to} co-signs the change_trust.`,
        {
          source: input.from,
          operations: [
            { type: 'begin_sponsoring_future_reserves', source: input.from, sponsoredId: input.to },
            { type: 'change_trust', source: input.to, asset },
            { type: 'end_sponsoring_future_reserves', source: input.to },
          ],
        },
      ),
      submitStep(input, 'Submit the sponsorship once approved and signed by both accounts.', [
        input.from,
        input.to,
      ]),
      step('read', 'buildPaymentPreflight', 'Re-run the pre-flight against the new trustline.', {
        from: input.from,
        to: input.to,
        asset,
        amount: input.amount,
      }),
      ...paymentSteps(input),
    ],
    RESERVE_XLM,
  );
};

const claimableBalance = (input: AlternativeInput): Plan =>
  finalize(
    input,
    'claimable_balance',
    `Send ${input.amount} ${assetLabel(input.asset)} to ${input.to} as a claimable balance`,
    [
      step('read', 'getAccount', 'Read the destination account state.', { address: input.to }),
      step(
        'build',
        'buildTransaction',
        `Build create_claimable_balance: ${input.to} can claim once its trustline accepts the asset.`,
        {
          source: input.from,
          operations: [
            {
              type: 'create_claimable_balance',
              asset: assetId(input.asset),
              amount: input.amount,
              claimants: [{ destination: input.to, predicate: 'unconditional' }],
            },
          ],
        },
      ),
      submitStep(input, 'Submit the claimable balance once the policy owner approves and signs.', [
        input.from,
      ]),
    ],
    RESERVE_XLM,
  );

const createAccount = (input: AlternativeInput): Plan =>
  finalize(input, 'create_account', `Create and fund ${input.to} with ${input.amount} XLM`, [
    step('read', 'getAccount', 'Confirm the destination is still not on the ledger.', {
      address: input.to,
    }),
    step(
      'build',
      'buildTransaction',
      'Build create_account with the payment as starting balance.',
      {
        source: input.from,
        operations: [
          { type: 'create_account', destination: input.to, startingBalance: input.amount },
        ],
      },
    ),
    submitStep(input, 'Submit the account creation once the policy owner approves and signs.', [
      input.from,
    ]),
  ]);

const BUILDERS: Record<AlternativeKind, (input: AlternativeInput) => Plan> = {
  sponsored_trustline: sponsoredTrustline,
  claimable_balance: claimableBalance,
  create_account: createAccount,
};

export const alternativePlan = (input: AlternativeInput): Plan | undefined => {
  const kind = chooseAlternative(input);
  return kind ? BUILDERS[kind](input) : undefined;
};
