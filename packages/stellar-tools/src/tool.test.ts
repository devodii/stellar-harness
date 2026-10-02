import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { defineTool, fail, invokeTool } from './tool';

const double = defineTool({
  name: 'double',
  description: 'Doubles a number',
  input: z.object({ n: z.number() }),
  output: z.object({ n: z.number() }),
  run: async ({ n }, ctx: { limit: number }) =>
    n > ctx.limit ? fail('POLICY_BLOCKED', 'too big') : { n: n * 2 },
});

describe('invokeTool', () => {
  it('returns data on success', async () => {
    const result = await invokeTool(double, { n: 2 }, { limit: 10 });
    expect(result).toMatchObject({ ok: true, data: { n: 4 }, meta: { tool: 'double' } });
  });

  it('rejects invalid input', async () => {
    const result = await invokeTool(double, { n: 'x' }, { limit: 10 });
    expect(result).toMatchObject({ ok: false, error: { code: 'INVALID_INPUT' } });
  });

  it('surfaces tool errors with their code', async () => {
    const result = await invokeTool(double, { n: 20 }, { limit: 10 });
    expect(result).toMatchObject({ ok: false, error: { code: 'POLICY_BLOCKED' } });
  });
});
