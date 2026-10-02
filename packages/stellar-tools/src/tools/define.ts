import type { z } from 'zod';
import type { ToolDefinition } from '../tool';
import { TOOL_DESCRIPTIONS } from './descriptions';
import type { ToolName } from './names';
import { TOOL_SCHEMAS, type ToolSchemas } from './schemas';

export type NamedToolDefinition<TName extends ToolName, TContext> = ToolDefinition<
  ToolSchemas[TName]['input'],
  ToolSchemas[TName]['output'],
  TContext
> & { name: TName };

export const defineNamedTool = <TName extends ToolName, TContext>(
  name: TName,
  run: (
    input: z.infer<ToolSchemas[TName]['input']>,
    ctx: TContext,
  ) => Promise<z.infer<ToolSchemas[TName]['output']>>,
): NamedToolDefinition<TName, TContext> => {
  const schemas: ToolSchemas[TName] = TOOL_SCHEMAS[name];
  return {
    name,
    description: TOOL_DESCRIPTIONS[name],
    input: schemas.input,
    output: schemas.output,
    run,
  };
};
