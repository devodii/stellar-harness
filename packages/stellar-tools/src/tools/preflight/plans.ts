import type { Plan } from '@harness/schema';
import { assemblePlan, handoff, type PlanDraft, read } from '../../plan/step';
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
};

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

const stableId = (parts: string[]): string => {
  let hash = 0x811c9dc5;
  for (const char of parts.join('|')) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
};

const assetLabel = (asset: ParsedAsset) => (asset.native ? 'XLM' : asset.code);

const readSource = (input: AlternativeInput) =>
  read('getAccount', 'Read the source account balances and reserve.', { address: input.from });

const sponsoredTrustline = (input: AlternativeInput): PlanDraft => {
  const label = assetLabel(input.asset);
  return {
    title: `Sponsor a ${label} trustline for ${input.to}, then pay`,
    steps: [
      readSource(input),
      read('getAccount', 'Read the destination account and its trustlines.', { address: input.to }),
    ],
    handoff: handoff(
      'account_signer',
      `The destination signs a change_trust for ${label}; the sender can sponsor its ${RESERVE_XLM} XLM reserve (CAP-33), but the destination's signature is still required.`,
      RESERVE_XLM,
    ),
  };
};

const claimableBalance = (input: AlternativeInput): PlanDraft => {
  const label = assetLabel(input.asset);
  return {
    title: `Send ${input.amount} ${label} to ${input.to} as a claimable balance`,
    steps: [
      readSource(input),
      read('getAccount', 'Read the destination account state.', { address: input.to }),
    ],
    handoff: handoff(
      'account_signer',
      `The sender's signers create a claimable balance of ${input.amount} ${label} for ${input.to}, claimable once its trustline accepts the asset (${RESERVE_XLM} XLM reserve until claimed).`,
      RESERVE_XLM,
    ),
  };
};

const createAccount = (input: AlternativeInput): PlanDraft => ({
  title: `Create and fund ${input.to} with ${input.amount} XLM`,
  steps: [
    readSource(input),
    read('getAccount', 'Confirm the destination is still not on the ledger.', {
      address: input.to,
    }),
  ],
  handoff: handoff(
    'account_signer',
    `The sender's signers fund ${input.to} with create_account, using the ${input.amount} XLM payment as its starting balance.`,
  ),
});

const BUILDERS: Record<AlternativeKind, (input: AlternativeInput) => PlanDraft> = {
  sponsored_trustline: sponsoredTrustline,
  claimable_balance: claimableBalance,
  create_account: createAccount,
};

export const alternativePlan = (input: AlternativeInput): Plan | undefined => {
  const kind = chooseAlternative(input);
  if (!kind) return undefined;
  const id = stableId([input.from, input.to, assetId(input.asset), input.amount]);
  return assemblePlan(`preflight-${kind}-${id}`, input.to, BUILDERS[kind](input));
};
