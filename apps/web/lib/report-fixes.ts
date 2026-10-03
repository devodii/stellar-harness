const FEE_AND_TIMEBOUND = 'Fee-bump (CAP-15) and send again within a fee cap.';
const RESERVE = 'Top up the XLM reserve before structural operations.';

export const PREVENTABLE_FIXES: Record<string, string> = {
  op_underfunded: 'Monitor the float and rebalance from treasury before paying.',
  op_low_reserve: RESERVE,
  op_no_trust: 'Check the trustline first; sponsor it (CAP-33) or use a claimable balance.',
  op_no_destination: 'Check the destination first; create and fund it, or hold the payment.',
  op_line_full: "Check the destination's trustline limit first; split or hold the payment.",
  tx_bad_seq: 'Use channel accounts and serialize submissions per source account.',
  tx_insufficient_fee: FEE_AND_TIMEBOUND,
  tx_too_late: FEE_AND_TIMEBOUND,
  tx_bad_auth: 'Collect the required signatures before the timebound and check thresholds.',
};

export const fixFor = (code: string): string =>
  PREVENTABLE_FIXES[code] ??
  (code === 'tx_failed'
    ? 'Envelope code for a failed operation; see the operation codes.'
    : 'Not preventable before submission: a market or contract condition at execution.');
