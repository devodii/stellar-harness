import { TOOL_NAMES } from '@harness/stellar-tools';
import { describe, expect, it } from 'vitest';
import { createAgentTools, systemPrompt } from './index';
import { createTestContext } from './testing';

describe('@harness/agent', () => {
  it('exports the agent surface', () => {
    expect(typeof systemPrompt).toBe('string');
    const tools = createAgentTools(createTestContext());
    expect(Object.keys(tools).sort()).toEqual([...TOOL_NAMES].sort());
    expect(Object.keys(tools)).toHaveLength(13);
  });
});
