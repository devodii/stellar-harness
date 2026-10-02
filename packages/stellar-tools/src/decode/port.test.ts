import { describe, expect, it } from 'vitest';
import { EnvelopeSummary } from '../tools/decoder-schemas';
import envelopes from './__fixtures__/envelope-xdr.json';
import { decodeEnvelopePort, portDecoders, toEnvelopePort } from './port';

const envelope = (label: string) => {
  const found = envelopes.find((entry) => entry.label === label);
  if (!found) throw new Error(`missing fixture ${label}`);
  return found.envelopeXdr;
};

describe('decodeEnvelopePort', () => {
  it.each(envelopes.map((entry) => [entry.label, entry.envelopeXdr] as const))(
    'maps the %s envelope to a valid port summary',
    (_label, xdr) => {
      const port = decodeEnvelopePort(xdr);
      expect(EnvelopeSummary.parse(port)).toEqual(port);
      expect(port.operationCount).toBe(port.opTypes.length);
      expect(port.operations).toHaveLength(port.opTypes.length);
    },
  );

  it('maps a fee bump to its inner source, outer fee and inner hash', () => {
    expect(decodeEnvelopePort(envelope('fee_bump'))).toMatchObject({
      sourceAccount: 'GAZNZKNQC7G2DIKUBQP6LFC4RV4D3K6QU44I7RATHP22OIBPVQRHXQXK',
      feeSource: 'GBEJMHIMASJBIGGV5UKACNIZTQN3ZCILKZBH6W5PFI5TPCFPT5ASN4CW',
      innerHash: '4041d7cc52bf4bc20a159662b02b7c6ad7383ec73f88db36700963abf935a61d',
      maxFee: '4500006',
      feeBump: true,
      timeBounds: { minTime: '1790546345', maxTime: '1791146345' },
    });
  });

  it('omits timebounds and inner hash when the envelope has none', () => {
    const port = decodeEnvelopePort(envelope('single_payment'));
    expect(port).not.toHaveProperty('timeBounds');
    expect(port).not.toHaveProperty('innerHash');
  });
});

describe('toEnvelopePort', () => {
  it('stringifies unix second timebounds', () => {
    const port = toEnvelopePort({
      feeBump: false,
      source: 'GSRC',
      feeSource: 'GSRC',
      fee: '100',
      innerFee: null,
      innerHash: null,
      seq: '1',
      opTypes: ['payment'],
      operations: [{ type: 'payment' }],
      memoType: 'none',
      memo: null,
      timeBounds: { minTime: 0, maxTime: 1790000000 },
    });
    expect(port.timeBounds).toEqual({ minTime: '0', maxTime: '1790000000' });
    expect(port.sequence).toBe('1');
  });
});

describe('portDecoders', () => {
  it('pairs the real result decoder with the envelope port', () => {
    expect(portDecoders.decodeEnvelopeSummary).toBe(decodeEnvelopePort);
  });
});
