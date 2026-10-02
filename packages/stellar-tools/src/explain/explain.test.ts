import { ACTION_BY_CODE } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { explainCodes, FailureExplanation } from './explain';

describe('explainCodes', () => {
  it('explains a tx level preventable failure with its suggested action', () => {
    const result = explainCodes({ tx: 'tx_bad_seq', ops: [] });
    expect(FailureExplanation.parse(result)).toEqual(result);
    expect(result.preventable).toBe(true);
    expect(result.suggestedAction).toBe(ACTION_BY_CODE.tx_bad_seq);
    expect(result.explanation).toMatch(/^tx_bad_seq: The sequence number/);
  });

  it('points at the failing operation inside tx_failed', () => {
    const result = explainCodes({ tx: 'tx_failed', ops: ['op_success', 'op_no_trust'] });
    expect(result.preventable).toBe(true);
    expect(result.explanation).toMatch(/^Operation 2 of 2 failed with op_no_trust/);
    expect(result.suggestedAction).toBe(ACTION_BY_CODE.op_no_trust);
    expect(result.perCode.map((row) => row.code)).toEqual([
      'tx_failed',
      'op_success',
      'op_no_trust',
    ]);
  });

  it('uses a category action for non preventable codes', () => {
    const result = explainCodes({ tx: 'tx_failed', ops: ['entry_archived'] });
    expect(result.preventable).toBe(false);
    expect(result.suggestedAction).toMatch(/restore any archived entries/);
  });

  it('uses the reserve action for tx_insufficient_balance without marking it preventable', () => {
    const result = explainCodes({ tx: 'tx_insufficient_balance', ops: [] });
    expect(result.preventable).toBe(false);
    expect(result.suggestedAction).toBe(ACTION_BY_CODE.tx_insufficient_balance);
  });

  it('prefers the preventable cause for the action when several ops fail', () => {
    const result = explainCodes({ tx: 'tx_failed', ops: ['function_trapped', 'op_underfunded'] });
    expect(result.suggestedAction).toBe(ACTION_BY_CODE.op_underfunded);
  });

  it('handles unknown codes without throwing', () => {
    const result = explainCodes({ tx: 'tx_failed', ops: ['op_from_the_future'] });
    expect(result.preventable).toBe(false);
    expect(result.explanation).toContain('Unrecognised result code op_from_the_future');
  });

  it('reports success plainly', () => {
    const result = explainCodes({ tx: 'tx_success', ops: ['op_success'] });
    expect(result.preventable).toBe(false);
    expect(result.suggestedAction).toBe('No action needed.');
  });
});
