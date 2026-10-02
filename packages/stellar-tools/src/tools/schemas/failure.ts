import { z } from 'zod';
import { FailureExplanation, ResultCodes } from '../../explain/explain';
import { TxHash } from './common';

export const ExplainFailureInput = z
  .object({
    codes: ResultCodes.optional(),
    resultXdr: z.string().min(1).optional(),
    hash: TxHash.optional(),
  })
  .refine(
    (input) => [input.codes, input.resultXdr, input.hash].filter(Boolean).length === 1,
    'Provide exactly one of codes, resultXdr or hash',
  );
export type ExplainFailureInput = z.infer<typeof ExplainFailureInput>;

export const ExplainFailureOutput = FailureExplanation;
export type ExplainFailureOutput = z.infer<typeof ExplainFailureOutput>;
