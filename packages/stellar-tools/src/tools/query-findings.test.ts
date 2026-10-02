import { MemoryStorage } from '@harness/storage';
import { describe, expect, it } from 'vitest';
import { makeFinding } from '../__fixtures__/findings';
import { invokeTool } from '../tool';
import { queryFindings } from './query-findings';

const archived = makeFinding('CONTRACT_INSTANCE_ARCHIVED', { severity: 'critical' });
const badSeq = makeFinding('TX_BAD_SEQ_CLUSTER', { tags: ['channel_pattern'] });
const anchor = makeFinding('ANCHOR_TOML_UNREACHABLE', { severity: 'critical', tags: ['anchor'] });

const seeded = () => new MemoryStorage({ findings: [archived, badSeq, anchor] });

describe('queryFindings tool', () => {
  it('filters by severity and returns the total', async () => {
    const result = await invokeTool(
      queryFindings,
      { severity: ['critical'] },
      { storage: seeded() },
    );
    expect(result.ok && result.data.total).toBe(2);
  });

  it('filters by tag', async () => {
    const result = await invokeTool(
      queryFindings,
      { tags: ['channel_pattern'] },
      { storage: seeded() },
    );
    expect(result.ok && result.data.rows.map((row) => row.type)).toEqual(['TX_BAD_SEQ_CLUSTER']);
  });
});
