import { Networks } from '@stellar/stellar-sdk';
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
    expect(decodeEnvelopeSummary(envelope('multi_op'), Networks.PUBLIC)).toEqual({
      feeBump: false,
      source: 'GCSSUJ5YNMFTTREJO3MIFSKZP5QP7CHCRT2HSV77O5EQZFQ2OABU6K3O',
      feeSource: 'GCSSUJ5YNMFTTREJO3MIFSKZP5QP7CHCRT2HSV77O5EQZFQ2OABU6K3O',
      fee: '400',
      innerFee: null,
      innerHash: null,
      seq: '276645320346064187',
      opTypes: ['manage_sell_offer', 'manage_buy_offer'],
      operations: [
        { type: 'manage_sell_offer' },
        {
          type: 'manage_buy_offer',
          source: 'GCWYMKQZN2XGCXOQD4TY6X5HQZ2EYLZCGV7U2UNHPSLPPXRYETTQVTM4',
        },
      ],
      memoType: 'none',
      memo: null,
      timeBounds: { minTime: 0, maxTime: 1790900900 },
    });
  });

  it('unwraps a fee bump to the inner transaction', () => {
    expect(decodeEnvelopeSummary(envelope('fee_bump'), Networks.PUBLIC)).toMatchObject({
      feeBump: true,
      source: 'GAZNZKNQC7G2DIKUBQP6LFC4RV4D3K6QU44I7RATHP22OIBPVQRHXQXK',
      feeSource: 'GBEJMHIMASJBIGGV5UKACNIZTQN3ZCILKZBH6W5PFI5TPCFPT5ASN4CW',
      fee: '4500006',
      innerFee: '102',
      innerHash: '4041d7cc52bf4bc20a159662b02b7c6ad7383ec73f88db36700963abf935a61d',
      opTypes: ['path_payment_strict_receive'],
      timeBounds: { minTime: 1790546345, maxTime: 1791146345 },
    });
  });

  it('reads text, id and hash memos the way horizon shows them', () => {
    expect(decodeEnvelopeSummary(envelope('memo_text'), Networks.PUBLIC)).toMatchObject({
      memoType: 'text',
      memo: 'QTC rewards!',
    });
    expect(decodeEnvelopeSummary(envelope('memo_id'), Networks.PUBLIC)).toMatchObject({
      memoType: 'id',
      memo: '3245667357452752649',
    });
    expect(decodeEnvelopeSummary(envelope('memo_hash'), Networks.PUBLIC)).toMatchObject({
      memoType: 'hash',
      memo: '/jmToFUqyg0T8xlUQh3bFO78eRDhOQweg1VEKZcABqQ=',
    });
  });

  it('reads destination, asset and amount from payment operations', () => {
    expect(decodeEnvelopeSummary(envelope('single_payment'), Networks.PUBLIC).operations).toEqual([
      {
        type: 'payment',
        source: 'GBAWLHZCKAQDG6GFR22FFIE6DIJECY5HU3E4IREVZ7G4TRAUDCVN6VXR',
        destination: 'GAHL2AK6UMA3M6YWKB56Y7APO5VINXW3R6MAXJQ6CWGB4J3XT7TJAQRY',
        asset: 'KTOKEN:GAFK7QYUEOGDVM4CTI7ELVQIMNPVYUH4D5XERZMYLK45DLHOC5CLQGIH',
        amount: '100.0000000',
      },
    ]);
  });

  it('reads create_account as an XLM payment of the starting balance', () => {
    expect(
      decodeEnvelopeSummary(envelope('single_create_account'), Networks.PUBLIC).operations,
    ).toEqual([
      {
        type: 'create_account',
        destination: 'GAAMIHE3H6VRC7OMIOFTD4QMBPDWOBVYE7OUUW4OSSHMT4FDFE3A5KT2',
        asset: 'XLM',
        amount: '2.0000000',
      },
    ]);
  });

  it('reads path payments from the destination side', () => {
    expect(
      decodeEnvelopeSummary(envelope('single_path_payment_strict_receive'), Networks.PUBLIC)
        .operations,
    ).toEqual([
      {
        type: 'path_payment_strict_receive',
        source: 'GDP4BEOE7ET5SD7TM34PGOMUKYP46IEREFTGWXZWSVHSU4I4ZDYTTBXW',
        destination: 'GDP4BEOE7ET5SD7TM34PGOMUKYP46IEREFTGWXZWSVHSU4I4ZDYTTBXW',
        asset: 'AQUA:GBNZILSTVQZ4R7IKQDGHYGY2QXL5QOFJYQMXPKWRRM5PAV7Y4M67AQUA',
        amount: '0.7336456',
      },
    ]);
    expect(
      decodeEnvelopeSummary(envelope('single_path_payment_strict_send'), Networks.PUBLIC)
        .operations,
    ).toEqual([
      {
        type: 'path_payment_strict_send',
        source: 'GD6LGTOHDGJSFNQTAQSU3V4FJKEF52FQGXEYUQCRKG2IJPGDRAKGTCIL',
        destination: 'GD6LGTOHDGJSFNQTAQSU3V4FJKEF52FQGXEYUQCRKG2IJPGDRAKGTCIL',
        asset: 'XLM',
        amount: '0.2600000',
      },
    ]);
  });

  it('keeps only type and source for non payment operations', () => {
    expect(
      decodeEnvelopeSummary(envelope('single_change_trust'), Networks.PUBLIC).operations,
    ).toEqual([
      { type: 'change_trust', source: 'GDMGW242MLMPOG5VURILEDUDAXILD2DA5T4QSUNGYFKTX5BN2K6UN4Z6' },
    ]);
  });

  it('reports missing timebounds as null', () => {
    expect(
      decodeEnvelopeSummary(envelope('single_payment'), Networks.PUBLIC).timeBounds,
    ).toBeNull();
  });

  it.each(
    envelopes
      .filter((entry) => entry.label.startsWith('single_'))
      .map((entry) => [entry.label.replace('single_', ''), entry.envelopeXdr] as const),
  )('names the %s operation in horizon snake case', (opType, xdr) => {
    expect(decodeEnvelopeSummary(xdr, Networks.PUBLIC).opTypes).toEqual([opType]);
  });
});
