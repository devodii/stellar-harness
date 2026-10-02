import { TOOL_NAMES } from '@harness/stellar-tools';
import { describe, expect, it } from 'vitest';
import { systemPrompt } from './system';

describe('systemPrompt', () => {
  it('names the agent and every tool', () => {
    expect(systemPrompt).toMatch(/^You are Stellar Harness, an operator agent/);
    for (const name of TOOL_NAMES) expect(systemPrompt).toContain(name);
  });

  it('carries the safety and approval rules', () => {
    expect(systemPrompt).toContain('Call a tool before stating any network fact');
    expect(systemPrompt).toContain('Never say or imply that a transaction was submitted');
    expect(systemPrompt).toContain('requiresApproval true, stop');
    expect(systemPrompt).toContain('"type":"plan-approval"');
  });

  it('contains no em dashes', () => {
    expect(systemPrompt).not.toContain(String.fromCharCode(0x2014));
  });
});
