import { xdr } from '@stellar/stellar-sdk';
import { describe, expect, it } from 'vitest';
import samples from './__fixtures__/result-xdr.json';
import {
  decodeResultCodes,
  decodeTransactionResult,
  failingOpCodes,
  innerOpCode,
  txCode,
} from './result-codes';

const sample = (target: string) => {
  const found = samples.find((entry) => entry.target === target);
  if (!found) throw new Error(`missing fixture ${target}`);
  return found;
};

const synthetic = (result: xdr.TransactionResultResult): string =>
  new xdr.TransactionResult({
    feeCharged: 100n,
    result,
    ext: xdr.TransactionResultExt.v0(),
  }).toXdr('base64');

const syntheticFeeBump = (inner: xdr.InnerTransactionResultResult): string =>
  synthetic(
    xdr.TransactionResultResult.txFeeBumpInnerFailed(
      new xdr.InnerTransactionResultPair({
        transactionHash: new Uint8Array(32),
        result: new xdr.InnerTransactionResult({
          feeCharged: 100n,
          result: inner,
          ext: xdr.InnerTransactionResultExt.v0(),
        }),
      }),
    ),
  );

describe('decodeResultCodes with real mainnet samples', () => {
  it.each(samples.map((entry) => [entry.target, entry] as const))(
    '%s decodes to its recorded code',
    (_target, entry) => {
      const decoded = decodeResultCodes(entry.resultXdr);
      expect([decoded.tx, ...decoded.ops]).toContain(entry.code);
    },
  );

  it('maps payment failures to horizon op codes', () => {
    expect(decodeResultCodes(sample('op_no_trust').resultXdr)).toMatchObject({
      tx: 'tx_failed',
      ops: ['op_no_trust'],
      feeBump: false,
    });
    expect(failingOpCodes(decodeResultCodes(sample('op_line_full').resultXdr))).toContain(
      'op_line_full',
    );
    expect(failingOpCodes(decodeResultCodes(sample('op_no_destination').resultXdr))).toContain(
      'op_no_destination',
    );
  });

  it('maps offer, path payment and reserve failures', () => {
    expect(decodeResultCodes(sample('op_underfunded').resultXdr).ops).toContain('op_underfunded');
    expect(decodeResultCodes(sample('op_low_reserve').resultXdr).ops).toContain('op_low_reserve');
    expect(decodeResultCodes(sample('code:op_cross_self').resultXdr).ops).toContain(
      'op_cross_self',
    );
    expect(decodeResultCodes(sample('code:op_offer_not_found').resultXdr).ops).toContain(
      'op_offer_not_found',
    );
    expect(decodeResultCodes(sample('path_payment_failure').resultXdr).ops).toEqual([
      'op_under_dest_min',
    ]);
    expect(decodeResultCodes(sample('code:op_over_source_max').resultXdr).ops).toEqual([
      'op_over_source_max',
    ]);
  });

  it('maps soroban host function failures', () => {
    expect(decodeResultCodes(sample('function_trapped').resultXdr).ops).toContain(
      'function_trapped',
    );
    expect(decodeResultCodes(sample('code:entry_archived').resultXdr).ops).toEqual([
      'entry_archived',
    ]);
    expect(decodeResultCodes(sample('code:resource_limit_exceeded').resultXdr).ops).toEqual([
      'resource_limit_exceeded',
    ]);
  });

  it('maps outer operation codes', () => {
    expect(decodeResultCodes(sample('code:op_no_source_account').resultXdr).ops).toContain(
      'op_no_source_account',
    );
    expect(decodeResultCodes(sample('code:op_exceeded_work_limit').resultXdr).ops).toContain(
      'op_exceeded_work_limit',
    );
  });

  it('recurses into a fee bump inner failure', () => {
    const decoded = decodeResultCodes(sample('fee_bump_inner_failed').resultXdr);
    expect(decoded).toMatchObject({
      feeBump: true,
      outerTx: 'tx_fee_bump_inner_failed',
      tx: 'tx_failed',
    });
    expect(failingOpCodes(decoded).length).toBeGreaterThan(0);
  });

  it('reports the fee charged', () => {
    expect(decodeResultCodes(sample('op_no_trust').resultXdr).feeCharged).toMatch(/^\d+$/);
  });
});

describe('decodeResultCodes with synthetic samples for codes absent from ledgers', () => {
  it.each([
    ['tx_bad_seq', xdr.TransactionResultResult.txBadSeq()],
    ['tx_insufficient_fee', xdr.TransactionResultResult.txInsufficientFee()],
    ['tx_too_late', xdr.TransactionResultResult.txTooLate()],
    ['tx_bad_auth', xdr.TransactionResultResult.txBadAuth()],
    ['tx_insufficient_balance', xdr.TransactionResultResult.txInsufficientBalance()],
    ['tx_no_source_account', xdr.TransactionResultResult.txNoAccount()],
    ['tx_bad_minseq_age_or_gap', xdr.TransactionResultResult.txBadMinSeqAgeOrGap()],
  ])('synthetic %s', (code, result) => {
    expect(decodeResultCodes(synthetic(result))).toEqual({
      tx: code,
      ops: [],
      feeBump: false,
      outerTx: code,
      feeCharged: '100',
    });
  });

  it('synthetic fee bump wrapping tx_bad_seq reports the inner code', () => {
    expect(
      decodeResultCodes(syntheticFeeBump(xdr.InnerTransactionResultResult.txBadSeq())),
    ).toMatchObject({ tx: 'tx_bad_seq', feeBump: true, outerTx: 'tx_fee_bump_inner_failed' });
  });

  it('decodes an already parsed result', () => {
    const parsed = xdr.TransactionResult.fromXdr(
      synthetic(xdr.TransactionResultResult.txTooEarly()),
      'base64',
    );
    expect(decodeTransactionResult(parsed).tx).toBe('tx_too_early');
  });
});

describe('innerOpCode', () => {
  it.each([
    ['payment', 'paymentSuccess', 'op_success'],
    ['payment', 'paymentSrcNotAuthorized', 'op_src_not_authorized'],
    ['createAccount', 'createAccountAlreadyExist', 'op_already_exists'],
    ['createAccount', 'createAccountLowReserve', 'op_low_reserve'],
    ['changeTrust', 'changeTrustNoIssuer', 'op_no_issuer'],
    ['changeTrust', 'changeTrustNotAuthMaintainLiabilities', 'op_not_aut_maintain_liabilities'],
    ['manageSellOffer', 'manageSellOfferCrossSelf', 'op_cross_self'],
    ['createPassiveSellOffer', 'manageSellOfferSellNoTrust', 'op_sell_no_trust'],
    ['manageBuyOffer', 'manageBuyOfferNotFound', 'op_offer_not_found'],
    ['pathPaymentStrictReceive', 'pathPaymentStrictReceiveOverSendmax', 'op_over_source_max'],
    ['pathPaymentStrictSend', 'pathPaymentStrictSendUnderDestmin', 'op_under_dest_min'],
    ['pathPaymentStrictSend', 'pathPaymentStrictSendOfferCrossSelf', 'op_cross_self'],
    ['accountMerge', 'accountMergeHasSubEntries', 'op_has_sub_entries'],
    ['accountMerge', 'accountMergeSeqnumTooFar', 'op_seq_num_too_far'],
    ['allowTrust', 'allowTrustNoTrustLine', 'op_no_trust'],
    ['allowTrust', 'allowTrustTrustNotRequired', 'op_not_required'],
    ['manageData', 'manageDataNameNotFound', 'op_data_name_not_found'],
    ['beginSponsoringFutureReserves', 'beginSponsoringFutureReservesRecursive', 'op_recursive'],
    ['endSponsoringFutureReserves', 'endSponsoringFutureReservesNotSponsored', 'op_not_sponsored'],
    ['invokeHostFunction', 'invokeHostFunctionTrapped', 'function_trapped'],
    [
      'invokeHostFunction',
      'invokeHostFunctionInsufficientRefundableFee',
      'insufficient_refundable_fee',
    ],
    ['extendFootprintTtl', 'extendFootprintTtlResourceLimitExceeded', 'resource_limit_exceeded'],
    ['restoreFootprint', 'restoreFootprintMalformed', 'op_malformed'],
  ])('%s %s -> %s', (operation, name, code) => {
    expect(innerOpCode(operation, name)).toBe(code);
  });
});

describe('txCode', () => {
  it('falls back to snake case for unknown tx codes', () => {
    expect(txCode('txFeeBumpInnerFailed')).toBe('tx_fee_bump_inner_failed');
    expect(txCode('txSomethingNew')).toBe('tx_something_new');
  });
});
