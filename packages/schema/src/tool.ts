import { z } from 'zod';
import { AppError } from './result';

export const ToolMeta = z.object({
  tool: z.string(),
  ms: z.number().nonnegative(),
  cached: z.boolean().optional(),
});
export type ToolMeta = z.infer<typeof ToolMeta>;

export const toolResult = <T extends z.ZodType>(data: T) =>
  z.discriminatedUnion('ok', [
    z.object({ ok: z.literal(true), data, meta: ToolMeta }),
    z.object({ ok: z.literal(false), error: AppError, meta: ToolMeta }),
  ]);

export type ToolResult<T> =
  | { ok: true; data: T; meta: ToolMeta }
  | { ok: false; error: AppError; meta: ToolMeta };
