import { xdr } from '@stellar/stellar-sdk';
import { camelToSnake } from './case';

export type DecodedResultCodes = {
  tx: string;
  ops: string[];
  feeBump: boolean;
  outerTx: string;
  feeCharged: string;
};

type TxCodeName = xdr.TransactionResultResult['type'];
type OuterOpCodeName = Exclude<xdr.OperationResult['type'], 'opInner'>;

export const TX_CODES: Record<TxCodeName, string> = {
  txFeeBumpInnerSuccess: 'tx_fee_bump_inner_success',
  txFeeBumpInnerFailed: 'tx_fee_bump_inner_failed',
  txSuccess: 'tx_success',
  txFailed: 'tx_failed',
  txTooEarly: 'tx_too_early',
  txTooLate: 'tx_too_late',
  txMissingOperation: 'tx_missing_operation',
  txBadSeq: 'tx_bad_seq',
  txBadAuth: 'tx_bad_auth',
  txInsufficientBalance: 'tx_insufficient_balance',
  txNoAccount: 'tx_no_source_account',
  txInsufficientFee: 'tx_insufficient_fee',
  txBadAuthExtra: 'tx_bad_auth_extra',
  txInternalError: 'tx_internal_error',
  txNotSupported: 'tx_not_supported',
  txBadSponsorship: 'tx_bad_sponsorship',
  txBadMinSeqAgeOrGap: 'tx_bad_minseq_age_or_gap',
  txMalformed: 'tx_malformed',
  txSorobanInvalid: 'tx_soroban_invalid',
  txFrozenKeyAccessed: 'tx_frozen_key_accessed',
};

export const OUTER_OP_CODES: Record<OuterOpCodeName, string> = {
  opBadAuth: 'op_bad_auth',
  opNoAccount: 'op_no_source_account',
  opNotSupported: 'op_not_supported',
  opTooManySubentries: 'op_too_many_subentries',
  opExceededWorkLimit: 'op_exceeded_work_limit',
  opTooManySponsoring: 'op_too_many_sponsoring',
};

// Horizon (services/horizon/internal/codes) renames these result suffixes; everything else is
// the XDR member name with its operation prefix stripped and snake_cased.
export const HORIZON_OP_SUFFIX_OVERRIDES: Record<string, string> = {
  AlreadyExist: 'already_exists',
  OfferCrossSelf: 'cross_self',
  OverSendmax: 'over_source_max',
  UnderDestmin: 'under_dest_min',
  NotFound: 'offer_not_found',
  NoTrustLine: 'no_trustline',
  TrustNotRequired: 'not_required',
  SeqnumTooFar: 'seq_num_too_far',
  NameNotFound: 'data_name_not_found',
  InvalidName: 'data_invalid_name',
  NotAuthMaintainLiabilities: 'not_aut_maintain_liabilities',
};

const RESULT_PREFIX_ALIASES: Record<string, string[]> = {
  createPassiveSellOffer: ['manageSellOffer'],
};

export const innerOpCode = (operation: string, resultName: string): string => {
  const prefixes = [operation, ...(RESULT_PREFIX_ALIASES[operation] ?? [])];
  const prefix = prefixes.find((candidate) => resultName.startsWith(candidate));
  if (!prefix) return `op_${camelToSnake(resultName)}`;
  const suffix = resultName.slice(prefix.length);
  return `op_${HORIZON_OP_SUFFIX_OVERRIDES[suffix] ?? camelToSnake(suffix)}`;
};

export const txCode = (name: string): string =>
  TX_CODES[name as TxCodeName] ?? camelToSnake(name).replace(/^tx_?/, 'tx_');

const hasType = (value: unknown): value is { type: string } =>
  typeof value === 'object' && value !== null && 'type' in value && typeof value.type === 'string';

export const operationResultCode = (result: xdr.OperationResult): string => {
  if (result.type !== 'opInner') return OUTER_OP_CODES[result.type] ?? camelToSnake(result.type);
  const inner = result.tr.value;
  return hasType(inner)
    ? innerOpCode(result.tr.type, inner.type)
    : `op_${camelToSnake(result.tr.type)}`;
};

type ResultBody = xdr.TransactionResultResult | xdr.InnerTransactionResultResult;

const opsOf = (result: ResultBody): string[] =>
  result.type === 'txSuccess' || result.type === 'txFailed'
    ? result.results.map(operationResultCode)
    : [];

export const decodeTransactionResult = (result: xdr.TransactionResult): DecodedResultCodes => {
  const outer = result.result;
  const outerTx = txCode(outer.type);
  if (outer.type === 'txFeeBumpInnerFailed' || outer.type === 'txFeeBumpInnerSuccess') {
    const inner = outer.innerResultPair.result.result;
    return {
      tx: txCode(inner.type),
      ops: opsOf(inner),
      feeBump: true,
      outerTx,
      feeCharged: result.feeCharged.toString(),
    };
  }
  return {
    tx: outerTx,
    ops: opsOf(outer),
    feeBump: false,
    outerTx,
    feeCharged: result.feeCharged.toString(),
  };
};

export const decodeResultCodes = (resultXdr: string): DecodedResultCodes =>
  decodeTransactionResult(xdr.TransactionResult.fromXdr(resultXdr, 'base64'));

export const failingOpCodes = (decoded: Pick<DecodedResultCodes, 'ops'>): string[] =>
  decoded.ops.filter((code) => code !== 'op_success');
