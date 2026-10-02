import { type AppError, appError, type ToolResult, toAppError } from '@harness/schema';
import type { z } from 'zod';

export type ToolDefinition<TInput extends z.ZodType, TOutput extends z.ZodType, TContext> = {
  name: string;
  description: string;
  input: TInput;
  output: TOutput;
  run: (input: z.infer<TInput>, ctx: TContext) => Promise<z.infer<TOutput>>;
};

export const defineTool = <TInput extends z.ZodType, TOutput extends z.ZodType, TContext>(
  definition: ToolDefinition<TInput, TOutput, TContext>,
): ToolDefinition<TInput, TOutput, TContext> => definition;

export class ToolError extends Error {
  readonly error: AppError;

  constructor(error: AppError) {
    super(error.message);
    this.error = error;
  }
}

export const fail = (...args: Parameters<typeof appError>): never => {
  throw new ToolError(appError(...args));
};

export const invokeTool = async <TInput extends z.ZodType, TOutput extends z.ZodType, TContext>(
  tool: ToolDefinition<TInput, TOutput, TContext>,
  rawInput: unknown,
  ctx: TContext,
): Promise<ToolResult<z.infer<TOutput>>> => {
  const started = performance.now();
  const meta = () => ({ tool: tool.name, ms: Math.round(performance.now() - started) });
  const input = tool.input.safeParse(rawInput);
  if (!input.success) {
    return {
      ok: false,
      error: appError('INVALID_INPUT', input.error.issues[0]?.message ?? 'Invalid input'),
      meta: meta(),
    };
  }
  try {
    const data = tool.output.parse(await tool.run(input.data, ctx));
    return { ok: true, data, meta: meta() };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof ToolError ? error.error : toAppError(error),
      meta: meta(),
    };
  }
};
