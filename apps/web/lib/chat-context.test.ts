import { type Finding, SUGGESTED_ACTION } from '@harness/schema';
import { describe, expect, it } from 'vitest';
import { dataPartToModelText } from './chat';
import {
  addContext,
  contextFromFinding,
  contextToModelText,
  EVIDENCE_BUDGET,
  excerptOf,
  REPLY_EXCERPT_LENGTH,
  replyContext,
} from './chat-context';

const finding = (evidence: Record<string, unknown> = { daysLeft: 12 }): Finding => ({
  findingId: 'f'.repeat(64),
  type: 'CONTRACT_INSTANCE_EXPIRING_30D',
  subjectKind: 'contract',
  subject: 'CDZYZVZNURK4DCD3ZJMBKLDYCB7FIYL3FRVSLRLGL2BEOIN53UP4YNQC',
  severity: 'high',
  evidence,
  suggestedAction: SUGGESTED_ACTION.CONTRACT_INSTANCE_EXPIRING_30D,
  snapshotLedger: 64_723_488,
  observedAt: '2026-10-02T00:00:00.000Z',
  tags: [],
});

describe('chat context', () => {
  it('keeps the fields the agent needs from a finding', () => {
    expect(contextFromFinding(finding())).toMatchObject({
      kind: 'finding',
      findingId: 'f'.repeat(64),
      severity: 'high',
      evidence: { daysLeft: 12 },
    });
  });

  it('trims large evidence and marks it truncated', () => {
    const big = Object.fromEntries(
      Array.from({ length: 50 }, (_, i) => [`k${i}`, 'x'.repeat(100)]),
    );
    const context = contextFromFinding(finding(big));
    expect(JSON.stringify(context.evidence).length).toBeLessThan(EVIDENCE_BUDGET + 200);
    expect(context.evidence.truncated).toBe(true);
  });

  it('does not attach the same finding twice', () => {
    const context = contextFromFinding(finding());
    expect(addContext(addContext([], context), context)).toHaveLength(1);
  });

  it('turns a context part into model text naming the finding id', () => {
    const context = contextFromFinding(finding());
    const text = dataPartToModelText({ type: 'data-context', data: context });
    expect(text?.text).toBe(contextToModelText(context));
    expect(text?.text).toContain(`findingId ${'f'.repeat(64)}`);
  });

  it('quotes a plain excerpt of the replied message', () => {
    const reply = replyContext('m1', '## Plan\n**Extend** the `TTL` now.\n\n```ts\ncode\n```');
    expect(reply).toEqual({ kind: 'reply', messageId: 'm1', excerpt: 'Plan Extend the TTL now.' });
    expect(contextToModelText(reply)).toContain('> Plan Extend the TTL now.');
  });

  it('caps long excerpts', () => {
    const excerpt = excerptOf('word '.repeat(200));
    expect(excerpt.length).toBeLessThanOrEqual(REPLY_EXCERPT_LENGTH + 1);
    expect(excerpt.endsWith('…')).toBe(true);
  });

  it('dedupes replies to the same message', () => {
    const reply = replyContext('m1', 'text');
    expect(addContext([reply], replyContext('m1', 'text'))).toHaveLength(1);
  });
});
