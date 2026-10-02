import { ACTION_BY_CODE } from '@harness/schema';
import type { HorizonAccount } from '../../ports';
import { formatStroops, toStroops } from '../amount';
import { assetId, findBalance, type ParsedAsset } from '../assets';
import { BASE_RESERVE_STROOPS, minimumBalanceStroops, nativeBalance } from '../reserve';
import type { PreflightBlocker, PreflightCheck, PreflightCheckName } from '../schemas';

export const BASE_FEE_STROOPS = 100n;
export const MIN_CREATE_ACCOUNT_STROOPS = 2n * BASE_RESERVE_STROOPS;

export const PREFLIGHT_FIX = {
  tx_no_source_account: 'Create and fund the source account before sending from it.',
  op_src_no_trust:
    'Add a trustline for the asset on the source account and fund it before sending.',
  op_not_authorized:
    'Ask the issuer to authorize the destination trustline, or hold the payment in a claimable balance until it is authorized.',
  op_no_destination: ACTION_BY_CODE.op_no_destination,
  op_no_trust: ACTION_BY_CODE.op_no_trust,
  op_underfunded: ACTION_BY_CODE.op_underfunded,
  op_low_reserve: ACTION_BY_CODE.op_low_reserve,
  tx_insufficient_balance: ACTION_BY_CODE.tx_insufficient_balance,
  op_line_full: ACTION_BY_CODE.op_line_full,
} as const;

export type PreflightCode = keyof typeof PREFLIGHT_FIX;

export type PreflightInput = {
  from: string;
  to: string;
  asset: ParsedAsset;
  amount: string;
  source: HorizonAccount | null;
  destination: HorizonAccount | null;
};

export type PreflightEvaluation = {
  checks: PreflightCheck[];
  blockers: (PreflightBlocker & { code: PreflightCode })[];
};

type Outcome = { ok: boolean; detail: string; blocker?: PreflightCode };

const pass = (detail: string): Outcome => ({ ok: true, detail });
const block = (blocker: PreflightCode, detail: string): Outcome => ({
  ok: false,
  detail,
  blocker,
});

const xlm = (stroops: bigint) => `${formatStroops(stroops)} XLM`;

const isIssuer = (asset: ParsedAsset, account: string) => !asset.native && asset.issuer === account;

const available = (balance: { balance: string; selling_liabilities?: string }) =>
  toStroops(balance.balance) - toStroops(balance.selling_liabilities ?? '0');

const sourceExists = ({ source, from }: PreflightInput): Outcome =>
  source ? pass(`${from} exists`) : block('tx_no_source_account', `${from} is not on the ledger`);

const destinationExists = ({ destination, to, asset, amount }: PreflightInput): Outcome => {
  if (destination) return pass(`${to} exists`);
  const note =
    asset.native && toStroops(amount) >= MIN_CREATE_ACCOUNT_STROOPS
      ? '; a create_account with this amount would open it'
      : '';
  return block('op_no_destination', `${to} is not on the ledger${note}`);
};

const sourceTrustline = ({ source, from, asset }: PreflightInput): Outcome => {
  if (asset.native) return pass('not applicable: native asset');
  if (isIssuer(asset, from)) return pass('source is the issuer');
  if (!source) return block('tx_no_source_account', 'source account missing');
  return findBalance(source, asset)
    ? pass(`source holds a ${asset.code} trustline`)
    : block('op_src_no_trust', `source has no ${assetId(asset)} trustline`);
};

const destinationTrustline = ({ destination, to, asset }: PreflightInput): Outcome => {
  if (asset.native) return pass('not applicable: native asset');
  if (isIssuer(asset, to)) return pass('destination is the issuer');
  if (!destination) return block('op_no_destination', 'destination account missing');
  return findBalance(destination, asset)
    ? pass(`destination holds a ${asset.code} trustline`)
    : block('op_no_trust', `destination has no ${assetId(asset)} trustline`);
};

const destinationAuthorized = ({ destination, to, asset }: PreflightInput): Outcome => {
  if (asset.native) return pass('not applicable: native asset');
  if (isIssuer(asset, to)) return pass('destination is the issuer');
  if (!destination) return block('op_no_destination', 'destination account missing');
  const line = findBalance(destination, asset);
  if (!line) return block('op_no_trust', 'no trustline to authorize');
  return line.is_authorized === false
    ? block('op_not_authorized', `the issuer has not authorized the ${asset.code} trustline`)
    : pass('trustline is authorized');
};

const sourceBalance = ({ source, from, asset, amount }: PreflightInput): Outcome => {
  if (!source) return block('tx_no_source_account', 'source account missing');
  if (isIssuer(asset, from)) return pass('issuer can send any amount it issues');
  const line = findBalance(source, asset);
  if (!line) return block('op_src_no_trust', `source holds no ${assetId(asset)}`);
  const spendable = available(line);
  const needed = toStroops(amount);
  const label = asset.native ? 'XLM' : asset.code;
  return spendable >= needed
    ? pass(`${formatStroops(spendable)} ${label} available after selling liabilities`)
    : block(
        'op_underfunded',
        `${formatStroops(spendable)} ${label} available after selling liabilities, ${formatStroops(needed)} needed`,
      );
};

const sourceReserve = ({ source, asset, amount }: PreflightInput): Outcome => {
  if (!source) return block('tx_no_source_account', 'source account missing');
  const native = nativeBalance(source);
  const minimum = minimumBalanceStroops(source);
  const spending = (asset.native ? toStroops(amount) : 0n) + BASE_FEE_STROOPS;
  const remaining = (native ? available(native) : 0n) - spending;
  const detail = `${xlm(remaining)} left against a minimum balance of ${xlm(minimum)}`;
  if (remaining >= minimum) return pass(detail);
  return block(asset.native ? 'op_low_reserve' : 'tx_insufficient_balance', detail);
};

const destinationLimit = ({ destination, to, asset, amount }: PreflightInput): Outcome => {
  if (asset.native) return pass('not applicable: native asset');
  if (isIssuer(asset, to)) return pass('destination is the issuer');
  if (!destination) return block('op_no_destination', 'destination account missing');
  const line = findBalance(destination, asset);
  if (!line?.limit) return block('op_no_trust', 'no trustline limit to check');
  const headroom =
    toStroops(line.limit) - toStroops(line.balance) - toStroops(line.buying_liabilities ?? '0');
  return headroom >= toStroops(amount)
    ? pass(`${formatStroops(headroom)} ${asset.code} of limit headroom`)
    : block('op_line_full', `${formatStroops(headroom)} ${asset.code} of limit headroom`);
};

const CHECKS: Record<PreflightCheckName, (input: PreflightInput) => Outcome> = {
  source_exists: sourceExists,
  destination_exists: destinationExists,
  source_trustline: sourceTrustline,
  destination_trustline: destinationTrustline,
  destination_authorized: destinationAuthorized,
  source_balance: sourceBalance,
  source_reserve: sourceReserve,
  destination_limit: destinationLimit,
};

export const evaluatePreflight = (input: PreflightInput): PreflightEvaluation => {
  const checks: PreflightCheck[] = [];
  const blockers: PreflightEvaluation['blockers'] = [];
  for (const [name, check] of Object.entries(CHECKS) as [
    PreflightCheckName,
    (input: PreflightInput) => Outcome,
  ][]) {
    const outcome = check(input);
    checks.push({ name, ok: outcome.ok, detail: outcome.detail });
    if (outcome.blocker && !blockers.some((b) => b.code === outcome.blocker)) {
      blockers.push({ code: outcome.blocker, fix: PREFLIGHT_FIX[outcome.blocker] });
    }
  }
  return { checks, blockers };
};
