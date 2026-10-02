import { PREVENTABLE_CODES } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { CodeInfo } from './code-info';
import { isResultCode, lookupCode, OP_RESULT_CODES, RESULT_CODES, TX_RESULT_CODES } from './codes';

describe('result code table', () => {
  it('names every code in horizon snake case with the right prefix', () => {
    for (const code of TX_RESULT_CODES) expect(code).toMatch(/^tx_[a-z_]+$/);
    for (const code of OP_RESULT_CODES) expect(code).toMatch(/^op_[a-z_]+$/);
  });

  it('validates every entry', () => {
    for (const info of Object.values(RESULT_CODES)) expect(CodeInfo.parse(info)).toEqual(info);
  });

  it('marks exactly the preventable codes as preventable', () => {
    const preventable = Object.entries(RESULT_CODES)
      .filter(([, info]) => info.preventable)
      .map(([code]) => code)
      .sort();
    expect(preventable).toEqual([...PREVENTABLE_CODES].sort());
  });

  it('covers the soroban and classic codes the decoder targets', () => {
    for (const code of [
      'tx_bad_seq',
      'tx_too_late',
      'tx_insufficient_balance',
      'tx_fee_bump_inner_failed',
      'tx_soroban_invalid',
      'op_no_trust',
      'op_underfunded',
      'op_over_source_max',
      'op_under_dest_min',
      'op_already_exists',
      'op_has_sub_entries',
      'op_already_sponsored',
      'op_not_sponsored',
      'op_trapped',
      'op_resource_limit_exceeded',
      'op_entry_archived',
      'op_insufficient_refundable_fee',
    ]) {
      expect(isResultCode(code)).toBe(true);
    }
  });

  it('keeps explanations short and free of em dashes', () => {
    for (const info of Object.values(RESULT_CODES)) {
      expect(info.explanation.split(/(?<=\.) /).length).toBeLessThanOrEqual(2);
      expect(info.explanation).not.toContain(String.fromCharCode(0x2014));
    }
  });

  it('returns null for unknown codes', () => {
    expect(lookupCode('op_made_up')).toBeNull();
    expect(lookupCode('toString')).toBeNull();
  });
});
