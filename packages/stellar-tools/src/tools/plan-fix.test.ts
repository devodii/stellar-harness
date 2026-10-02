import { Plan } from '@harness/schema';
import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { makeFinding } from '../__fixtures__/findings';
import { invokeTool } from '../tool';
import { planFix } from './plan-fix';

const archived = makeFinding('CONTRACT_INSTANCE_ARCHIVED', { severity: 'critical' });
const badSeq = makeFinding('TX_BAD_SEQ_CLUSTER', { tags: ['channel_pattern'] });
const anchor = makeFinding('ANCHOR_TOML_UNREACHABLE', { severity: 'critical', tags: ['anchor'] });

const seeded = () => new MemoryStorage({ findings: [archived, badSeq, anchor] });
const policy = { spendCapXlm: 5 };

describe('planFix tool', () => {
  it('plans a stored finding', async () => {
    const result = await invokeTool(
      planFix,
      { findingId: archived.findingId },
      { storage: seeded(), policy },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Plan.parse(result.data).planId).toBe(`plan_${archived.findingId.slice(0, 12)}`);
    expect(result.meta.tool).toBe('planFix');
  });

  it('returns NOT_FOUND for an unknown finding', async () => {
    const result = await invokeTool(
      planFix,
      { findingId: 'f'.repeat(64) },
      { storage: seeded(), policy },
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  it('rejects a malformed finding id', async () => {
    const result = await invokeTool(planFix, { findingId: 'abc' }, { storage: seeded(), policy });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });
});
