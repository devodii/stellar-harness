import type { FindingType } from './finding';

export const PREVENTABLE_CODES = [
  'tx_bad_seq',
  'tx_insufficient_fee',
  'tx_too_late',
  'tx_bad_auth',
  'op_no_trust',
  'op_underfunded',
  'op_no_destination',
  'op_low_reserve',
  'op_line_full',
] as const;
export type PreventableCode = (typeof PREVENTABLE_CODES)[number];

export const isPreventableCode = (code: string): code is PreventableCode =>
  (PREVENTABLE_CODES as readonly string[]).includes(code);

const EXTEND_TTL = 'Extend instance TTL (ExtendFootprintTTL) to 12 months within rent budget.';
const FEE_AND_TIMEBOUND =
  'Fee and timebound management: fee-bump (CAP-15) and send again within a fee cap.';
const RESERVE =
  'Reserve management: top up XLM reserve before structural ops (signers, trustlines, offers).';

export const ACTION_BY_CODE: Record<PreventableCode | 'tx_insufficient_balance', string> = {
  tx_bad_seq:
    'Sequence management: provision channel accounts and serialize submissions per source account.',
  tx_insufficient_fee: FEE_AND_TIMEBOUND,
  tx_too_late: FEE_AND_TIMEBOUND,
  tx_bad_auth:
    'Signature orchestration: collect required signatures before the timebound and verify weights against thresholds.',
  op_no_trust:
    'Pre-flight trustline check; sponsor the trustline (CAP-33) or route via claimable balance.',
  op_underfunded: 'Float monitoring: alert at a threshold and rebalance from treasury.',
  op_no_destination:
    'Pre-flight destination check; create and fund the destination, or hold the payment.',
  op_low_reserve: RESERVE,
  tx_insufficient_balance: RESERVE,
  op_line_full: 'Pre-flight limit check against destination trustline limit; split or hold.',
};

export const SUGGESTED_ACTION: Record<FindingType, string> = {
  CONTRACT_INSTANCE_ARCHIVED:
    'Restore the instance (RestoreFootprint), then extend its TTL on a schedule.',
  CONTRACT_CODE_ARCHIVED:
    'Restore contract code (RestoreFootprint); all instances sharing this wasm are affected.',
  CONTRACT_INSTANCE_EXPIRING_30D: EXTEND_TTL,
  CONTRACT_INSTANCE_EXPIRING_90D: EXTEND_TTL,
  CONTRACT_LIVE_IDLE: 'Idle contract: decide to keep (schedule TTL extension) or let archive.',
  CONTRACT_UNVERIFIED_SOURCE:
    'Publish verified source (SEP-55/58) so operators can audit what they are keeping alive.',
  CONTRACT_RENT_12M: 'Budget 12 months of rent and schedule the TTL extension.',
  TX_BAD_SEQ_CLUSTER: ACTION_BY_CODE.tx_bad_seq,
  TX_INSUFFICIENT_FEE_CLUSTER: ACTION_BY_CODE.tx_insufficient_fee,
  TX_TOO_LATE_CLUSTER: ACTION_BY_CODE.tx_too_late,
  TX_BAD_AUTH_CLUSTER: ACTION_BY_CODE.tx_bad_auth,
  OP_NO_TRUST_CLUSTER: ACTION_BY_CODE.op_no_trust,
  OP_UNDERFUNDED_CLUSTER: ACTION_BY_CODE.op_underfunded,
  OP_NO_DESTINATION_CLUSTER: ACTION_BY_CODE.op_no_destination,
  OP_LOW_RESERVE_CLUSTER: ACTION_BY_CODE.op_low_reserve,
  OP_LINE_FULL_CLUSTER: ACTION_BY_CODE.op_line_full,
  ANCHOR_TOML_UNREACHABLE:
    'Serve stellar.toml at /.well-known/stellar.toml over HTTPS with a 200 and valid TOML.',
  ANCHOR_TOML_MISSING_SIGNING_KEY: 'Publish SIGNING_KEY in stellar.toml so SEP-10 can be verified.',
  ANCHOR_TOML_NO_ACCOUNTS: 'List operational ACCOUNTS and CURRENCIES issuers in stellar.toml.',
  ANCHOR_HOME_DOMAIN_MISMATCH: 'Set home_domain on the listed accounts to the anchor domain.',
  ANCHOR_ISSUER_FLAGS: 'Review issuer flags against the asset terms published in stellar.toml.',
  ANCHOR_NO_SEP_ENDPOINTS: 'Publish the SEP endpoints the anchor supports in stellar.toml.',
  ANCHOR_INFO_UNREADABLE: 'Fix the /info endpoint so wallets can discover supported assets.',
  ANCHOR_SEP10_CHALLENGE_FAILS:
    'Fix the SEP-10 challenge: signed by SIGNING_KEY, manage_data home domain, timebounds set.',
  ANCHOR_SEP38_PRICES_FAILS: 'Fix the SEP-38 /info endpoint so quotes can be requested.',
  ANCHOR_SEP31_INFO_FAILS: 'Fix the SEP-31 /info endpoint so senders can discover receive assets.',
  ANCHOR_TESTS_FAILED: 'Run stellar-anchor-tests in CI and fix the failing SEP checks.',
  ANCHOR_TLS_OR_CORS_BROKEN:
    'Serve stellar.toml and /info with valid TLS and Access-Control-Allow-Origin: *.',
  REPO_TTL_ISSUE: 'Schedule TTL extension and restore instead of fixing by hand.',
  REPO_TX_FAILURE_ISSUE: 'Add pre-flight checks and sequence management before submission.',
  REPO_ANCHOR_CONFORMANCE_ISSUE: 'Run anchor conformance probes on every release.',
};
