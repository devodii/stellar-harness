import { describe, expect, it } from 'vitest';
import envelopes from './__fixtures__/envelope-xdr.json';
import { decodeEnvelopeSummary } from './envelope';

const envelope = (label: string) => {
  const found = envelopes.find((entry) => entry.label === label);
  if (!found) throw new Error(`missing fixture ${label}`);
  return found.envelopeXdr;
};

describe('decodeEnvelopeSummary with real mainnet envelopes', () => {
  it('summarises a multi operation transaction with timebounds', () => {
    expect(decodeEnvelopeSummary(envelope('multi_op'))).toEqual({
      feeBump: false,
      source: 'GCSSUJ5YNMFTTREJO3MIFSKZP5QP7CHCRT2HSV77O5EQZFQ2OABU6K3O',
      feeSource: 'GCSSUJ5YNMFTTREJO3MIFSKZP5QP7CHCRT2HSV77O5EQZFQ2OABU6K3O',
      fee: '400',
      innerFee: null,
      seq: '276645320346064187',
      opTypes: ['manage_sell_offer', 'manage_buy_offer'],
      memoType: 'none',
      memo: null,
      timeBounds: { minTime: 0, maxTime: 1790900900 },
    });
  });

  it('unwraps a fee bump to the inner transaction', () => {
    expect(decodeEnvelopeSummary(envelope('fee_bump'))).toMatchObject({
      feeBump: true,
      source: 'GAZNZKNQC7G2DIKUBQP6LFC4RV4D3K6QU44I7RATHP22OIBPVQRHXQXK',
      feeSource: 'GBEJMHIMASJBIGGV5UKACNIZTQN3ZCILKZBH6W5PFI5TPCFPT5ASN4CW',
      fee: '4500006',
      innerFee: '102',
      opTypes: ['path_payment_strict_receive'],
      timeBounds: { minTime: 1790546345, maxTime: 1791146345 },
    });
  });

  it('reads text, id and hash memos the way horizon shows them', () => {
    expect(decodeEnvelopeSummary(envelope('memo_text'))).toMatchObject({
      memoType: 'text',
      memo: 'QTC rewards!',
    });
    expect(decodeEnvelopeSummary(envelope('memo_id'))).toMatchObject({
      memoType: 'id',
      memo: '3245667357452752649',
    });
    expect(decodeEnvelopeSummary(envelope('memo_hash'))).toMatchObject({
      memoType: 'hash',
      memo: '/jmToFUqyg0T8xlUQh3bFO78eRDhOQweg1VEKZcABqQ=',
    });
  });

  it('reports missing timebounds as null', () => {
    expect(decodeEnvelopeSummary(envelope('single_payment')).timeBounds).toBeNull();
  });

  it.each(
    envelopes
      .filter((entry) => entry.label.startsWith('single_'))
      .map((entry) => [entry.label.replace('single_', ''), entry.envelopeXdr] as const),
  )('names the %s operation in horizon snake case', (opType, xdr) => {
    expect(decodeEnvelopeSummary(xdr).opTypes).toEqual([opType]);
  });
});
