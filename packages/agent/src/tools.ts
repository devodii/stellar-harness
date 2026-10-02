import type { AppError, ToolMeta } from '@harness/schema';
import {
  type DecodeContext,
  explainFailure,
  getSummary,
  invokeTool,
  type PolicyContext,
  planFix,
  queryFindings,
  type StellarlightContext,
  type StorageContext,
  searchEcosystem,
  type ToolDefinition,
} from '@harness/stellar-tools';
import {
  type InferUITools,
  type JSONSchema7,
  jsonSchema,
  tool,
  type UIDataTypes,
  type UIMessage,
} from 'ai';
import { z } from 'zod';

export type ToolEnvelope<T> =
  | { ok: true; data: T; meta: ToolMeta }
  | { ok: false; error: Omit<AppError, 'cause'>; meta: ToolMeta };

const withoutCause = ({ code, message, meta }: AppError): Omit<AppError, 'cause'> =>
  meta === undefined ? { code, message } : { code, message, meta };

const deferredValidation = <T>(schema: z.ZodType) =>
  jsonSchema<T>(() => z.toJSONSchema(schema, { io: 'input' }) as JSONSchema7, {
    validate: (value) => ({ success: true, value: value as T }),
  });

export const toAiTool = <TInput extends z.ZodType, TOutput extends z.ZodType, TContext>(
  definition: ToolDefinition<TInput, TOutput, TContext>,
  ctx: TContext,
) =>
  tool<z.input<TInput>, ToolEnvelope<z.output<TOutput>>, Record<string, never>>({
    description: definition.description,
    inputSchema: deferredValidation<z.input<TInput>>(definition.input),
    execute: async (input) => {
      const result = await invokeTool(definition, input, ctx);
      return result.ok ? result : { ...result, error: withoutCause(result.error) };
    },
  });

export type AgentToolContext = StorageContext & PolicyContext & DecodeContext & StellarlightContext;

export const createAgentTools = <TContext extends AgentToolContext>(ctx: TContext) => ({
  planFix: toAiTool(planFix, ctx),
  queryFindings: toAiTool(queryFindings, ctx),
  getSummary: toAiTool(getSummary, ctx),
  explainFailure: toAiTool(explainFailure, ctx),
  searchEcosystem: toAiTool(searchEcosystem, ctx),
});

export type AgentTools = ReturnType<typeof createAgentTools>;
export type AgentUITools = InferUITools<AgentTools>;
export type AgentUIMessage = UIMessage<unknown, UIDataTypes, AgentUITools>;
