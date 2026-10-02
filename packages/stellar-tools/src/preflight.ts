import { assetName } from './account';
import { BASE_RESERVE_XLM, type Clients, type HorizonAccount } from './clients';

const EXPLANATIONS = {
  op_no_trust: {
    plain: 'the receiving account has no trustline for this asset',
    fix: 'the receiver adds a trustline, or the sender sponsors one for it',
  },
  op_underfunded: {
    plain: 'the sending account does not hold enough of the asset',
    fix: 'top up the sending account before paying',
  },
  op_no_destination: {
    plain: 'the receiving account does not exist on the network',
    fix: 'create and fund the receiving account first',
  },
  op_low_reserve: {
    plain: 'the payment would leave an account below its minimum XLM reserve',
    fix: 'add XLM to cover the reserve',
  },
  tx_bad_seq: {
    plain: 'the transaction sequence number does not follow the account sequence',
    fix: 'reload the account and rebuild the transaction',
  },
  tx_insufficient_fee: {
    plain: 'the fee is below what the network currently charges',
    fix: 'raise the fee or retry when the network is quieter',
  },
  tx_too_late: {
    plain: 'the transaction expired before it was included in a ledger',
    fix: 'rebuild it with a later time bound',
  },
} as const;

export type BlockerCode = keyof typeof EXPLANATIONS;
export type Blocker = { code: BlockerCode; plain: string; fix: string };
export type Preflight = { ok: boolean; blockers: Blocker[] };
export type PaymentInput = { from: string; to: string; asset: string; amount: number };

const blocker = (code: BlockerCode): Blocker => ({ code, ...EXPLANATIONS[code] });

const holding = (account: HorizonAccount, asset: string) =>
  account.balances.find((b) =>
    asset === 'XLM' ? b.asset_type === 'native' : assetName(b.asset_code, b.asset_issuer) === asset,
  );

export const spendableXlm = (account: HorizonAccount): number => {
  const entries =
    2 + account.subentry_count + (account.num_sponsoring ?? 0) - (account.num_sponsored ?? 0);
  const native = holding(account, 'XLM');
  return (
    Number(native?.balance ?? 0) -
    Number(native?.selling_liabilities ?? 0) -
    entries * BASE_RESERVE_XLM
  );
};

export const checkPayment = (
  input: PaymentInput,
  source: HorizonAccount,
  destination: HorizonAccount | null,
): Preflight => {
  const blockers: Blocker[] = [];
  if (!destination) blockers.push(blocker('op_no_destination'));
  else if (input.asset !== 'XLM' && !holding(destination, input.asset)) {
    blockers.push(blocker('op_no_trust'));
  }
  if (input.asset === 'XLM') {
    if (Number(holding(source, 'XLM')?.balance ?? 0) < input.amount) {
      blockers.push(blocker('op_underfunded'));
    } else if (spendableXlm(source) < input.amount) {
      blockers.push(blocker('op_low_reserve'));
    }
  } else if (Number(holding(source, input.asset)?.balance ?? 0) < input.amount) {
    blockers.push(blocker('op_underfunded'));
  }
  return { ok: blockers.length === 0, blockers };
};

export const buildPaymentPreflight = async (
  clients: Clients,
  input: PaymentInput,
): Promise<Preflight> => {
  const [source, destination] = await Promise.all([
    clients.loadAccount(input.from),
    clients.loadAccount(input.to),
  ]);
  if (!source) throw new Error(`Source account ${input.from} does not exist`);
  return checkPayment(input, source, destination);
};
