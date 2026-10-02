import { explainCodes, type ResultCodes } from '../explain/explain';
import { fail } from '../tool';
import type { DecodeContext } from './context';
import { defineNamedTool } from './define';
import type { ExplainFailureInput } from './schemas';

const resolveCodes = async (
  input: ExplainFailureInput,
  ctx: DecodeContext,
): Promise<ResultCodes> => {
  if (input.codes) return input.codes;
  if (input.resultXdr) {
    if (!ctx.decodeResultCodes) {
      return fail('INTERNAL', 'Decoding result XDR is not configured in this context.');
    }
    return ctx.decodeResultCodes(input.resultXdr);
  }
  if (input.hash) {
    if (!ctx.getTransaction) {
      return fail('INTERNAL', 'Transaction lookup is not configured in this context.');
    }
    return (await ctx.getTransaction(input.hash)).resultCodes;
  }
  return fail('INVALID_INPUT', 'Provide exactly one of codes, resultXdr or hash');
};

export const explainFailure = defineNamedTool('explainFailure', async (input, ctx: DecodeContext) =>
  explainCodes(await resolveCodes(input, ctx)),
);
