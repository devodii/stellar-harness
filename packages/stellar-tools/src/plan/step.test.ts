import { ROADMAP_NOTE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { makeFinding } from '../__fixtures__/findings';
import { contractRef, evidenceNumber, evidenceString, sampleTxHash } from './evidence';
import { assemblePlan, HANDOFF_TOOL, handoff, read, simulate } from './step';

describe('assemblePlan', () => {
  const draft = {
    title: 'Extend TTL',
    steps: [read('getContractTtl', 'r', {}), simulate('simulateExtendTtl', 's', {})],
    handoff: handoff('any_payer', 'Any account can pay.', 0.25),
  };

  it('numbers the steps and appends the single handoff step', () => {
    const plan = assemblePlan('plan_x', 'CSUBJECT', draft);
    expect(plan.steps.map((step) => [step.id, step.kind, step.tool])).toEqual([
      ['s1', 'read', 'getContractTtl'],
      ['s2', 'simulate', 'simulateExtendTtl'],
      ['s3', 'handoff', HANDOFF_TOOL],
    ]);
    expect(plan.steps.at(-1)?.description).toBe(
      'Hand off to any account willing to pay the fee; the harness stops here.',
    );
  });

  it('adds the fixed roadmap note and keeps the cost only when given', () => {
    expect(assemblePlan('plan_x', 'CSUBJECT', draft).handoff).toEqual({
      summary: 'Any account can pay.',
      requiredAuthority: 'any_payer',
      estimatedCostXlm: 0.25,
      roadmapNote: ROADMAP_NOTE,
    });
    expect(handoff('contract_admin', 'Admin acts.')).not.toHaveProperty('estimatedCostXlm');
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
