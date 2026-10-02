import { createHash } from 'node:crypto';
import { type Finding, ROADMAP_NOTE, SUGGESTED_ACTION } from '@harness/schema';
import { type ProbeAnchorOutput, TOOL_DESCRIPTIONS, TOOL_NAMES } from '@harness/stellar-tools';
import { MemoryStorage } from '@harness/storage';
import { generateText, stepCountIs } from 'ai';
import { MockLanguageModelV4 } from 'ai/test';
import { describe, expect, it } from 'vitest';
import { createTestContext, TEST_LEDGER } from './testing';
import { createAgentTools, type ToolEnvelope } from './tools';

const finding: Finding = {
  findingId: createHash('sha256').update('CONTRACT_INSTANCE_EXPIRING_30D').digest('hex'),
  type: 'CONTRACT_INSTANCE_EXPIRING_30D',
  subjectKind: 'contract',
  subject: 'CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA',
  severity: 'high',
  evidence: { daysLeft: 12 },
  suggestedAction: SUGGESTED_ACTION.CONTRACT_INSTANCE_EXPIRING_30D,
  snapshotLedger: 59_000_000,
  observedAt: '2026-10-02T00:00:00.000Z',
  tags: ['scf_funded'],
};

const ctx = createTestContext({ storage: new MemoryStorage({ findings: [finding] }) });
const options = { toolCallId: 'call_1', messages: [], context: {} };

describe('createAgentTools', () => {
  const tools = createAgentTools(ctx);

  it('uses the canonical tool names and descriptions', () => {
    for (const [name, tool] of Object.entries(tools)) {
      expect(TOOL_NAMES).toContain(name);
      expect(tool.description).toBe(TOOL_DESCRIPTIONS[name as keyof typeof TOOL_DESCRIPTIONS]);
    }
  });

  it('returns the success envelope from execute', async () => {
    const result = await tools.planFix.execute({ findingId: finding.findingId }, options);
    expect(result).toMatchObject({
      ok: true,
      data: {
        planId: `plan_${finding.findingId.slice(0, 12)}`,
        handoff: { roadmapNote: ROADMAP_NOTE },
      },
      meta: { tool: 'planFix' },
    });
  });

  it('reads accounts through the horizon port', async () => {
    const address = 'GASWSYFT5UDG7JTJQI2CGO6HF5KQIQAP5L6JCNM3ETMUFIARTQ73ATMB';
    const result = await tools.getAccount.execute({ address }, options);
    expect(result).toMatchObject({ ok: true, data: { address, exists: false } });
  });

  it('stamps anchor probe findings with the context ledger', async () => {
    const result = (await tools.probeAnchor.execute(
      { domain: 'anchor.test' },
      options,
    )) as ToolEnvelope<ProbeAnchorOutput>;
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.findings.length).toBeGreaterThan(0);
    for (const item of result.data.findings) expect(item.snapshotLedger).toBe(TEST_LEDGER);
  });

  it('returns invalid input as an error envelope instead of throwing', async () => {
    const result = await tools.planFix.execute({ findingId: 'nope' }, options);
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('strips non serialisable causes from error envelopes', async () => {
    const failing = createAgentTools({
      ...ctx,
      getTransaction: async () => {
        throw new Error('horizon unavailable');
      },
    });
    const result = (await failing.explainFailure.execute(
      { hash: 'd'.repeat(64) },
      options,
    )) as ToolEnvelope<unknown>;
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ code: 'INTERNAL', message: 'horizon unavailable' });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });

  it('runs inside a tool loop and feeds the envelope back to the model', async () => {
    const model = new MockLanguageModelV4({
      doGenerate: [
        {
          content: [
            {
              type: 'tool-call',
              toolCallId: 'call_1',
              toolName: 'planFix',
              input: JSON.stringify({ findingId: finding.findingId }),
            },
          ],
          finishReason: { unified: 'tool-calls', raw: undefined },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        },
        {
          content: [{ type: 'text', text: 'Plan ready. Approve or decline.' }],
          finishReason: { unified: 'stop', raw: undefined },
          usage: {
            inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
            outputTokens: { total: 1, text: 1, reasoning: 0 },
          },
          warnings: [],
        },
      ],
    });

    const result = await generateText({
      model,
      tools,
      prompt: 'plan a fix',
      stopWhen: stepCountIs(10),
    });

    const toolResults = result.steps.flatMap((step) => step.toolResults);
    expect(toolResults).toHaveLength(1);
    expect(toolResults[0]?.output).toMatchObject({ ok: true, data: { subject: finding.subject } });
    expect(result.text).toBe('Plan ready. Approve or decline.');
  });
});
