import { describe, expect, it } from 'vitest';
import { FINDINGS_PAGE_SIZE, FindingsQueryParams } from './api-schemas';

describe('FindingsQueryParams', () => {
  it('defaults paging and leaves filters empty', () => {
    expect(FindingsQueryParams.parse({})).toEqual({
      type: undefined,
      severity: undefined,
      tag: undefined,
      subject: undefined,
      limit: FINDINGS_PAGE_SIZE,
      offset: 0,
    });
  });

  it('accepts single and repeated values', () => {
    const parsed = FindingsQueryParams.parse({
      type: 'OP_NO_TRUST_CLUSTER',
      severity: ['high', 'critical'],
      tag: 'anchor',
      limit: '10',
      offset: '20',
      subject: '',
    });
    expect(parsed.type).toEqual(['OP_NO_TRUST_CLUSTER']);
    expect(parsed.severity).toEqual(['high', 'critical']);
    expect(parsed.tag).toEqual(['anchor']);
    expect(parsed.subject).toBeUndefined();
    expect(parsed.limit).toBe(10);
    expect(parsed.offset).toBe(20);
  });

  it('rejects unknown finding types', () => {
    expect(FindingsQueryParams.safeParse({ type: 'NOPE' }).success).toBe(false);
  });
});
