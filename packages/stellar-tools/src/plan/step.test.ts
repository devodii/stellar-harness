import { describe, expect, it } from 'vitest';
import { makeFinding } from '../__fixtures__/findings';
import { contractRef, evidenceNumber, evidenceString, sampleTxHash } from './evidence';
import { build, linkSteps, read, simulate, submit, withNetwork } from './step';

describe('linkSteps', () => {
  it('links builds to the last simulation and submits to the last build', () => {
    const steps = linkSteps([
      read('getContractTtl', 'r', {}),
      simulate('simulateExtendTtl', 's', {}),
      build('b', {}),
      submit('x'),
    ]);
    expect(steps[2]?.args).toEqual({ fromStep: 's2' });
    expect(steps[3]?.args).toEqual({ fromStep: 's3' });
  });

  it('leaves explicit links and unlinked builds alone', () => {
    const steps = linkSteps([build('b', { fromStep: 's9' }), build('c', {})]);
    expect(steps[0]?.args).toEqual({ fromStep: 's9' });
    expect(steps[1]?.args).toEqual({});
  });
});

describe('withNetwork', () => {
  it('names the network on submit steps only', () => {
    const steps = withNetwork([build('b', {}), submit('x')], 'testnet');
    expect(steps[0]?.args).toEqual({});
    expect(steps[1]?.args).toEqual({ network: 'testnet' });
  });
});

describe('evidence readers', () => {
  const evidence = { count: '40', sampleHashes: ['abc'], empty: '', wasm: 'ff' };

  it('reads strings, first array entries and numeric strings', () => {
    expect(evidenceString(evidence, 'missing', 'sampleHashes')).toBe('abc');
    expect(evidenceString(evidence, 'empty')).toBeUndefined();
    expect(evidenceNumber(evidence, 'count')).toBe(40);
    expect(evidenceNumber(evidence, 'wasm')).toBeUndefined();
  });

  it('finds the sample hash and contract reference on a finding', () => {
    const finding = makeFinding('CONTRACT_CODE_ARCHIVED', {
      subject: 'ff'.repeat(32),
      evidence: { sampleTxHash: 'h', contracts: ['CCONTRACT'] },
    });
    expect(sampleTxHash(finding)).toBe('h');
    expect(contractRef(finding)).toBe('CCONTRACT');
  });
});
