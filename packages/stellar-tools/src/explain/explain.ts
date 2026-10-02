import { ACTION_BY_CODE } from '@harness/schema';
import { z } from 'zod';
import { CATEGORY_ACTION } from './category-action';
import { lookupCode } from './codes';

export const ResultCodes = z.object({
  tx: z.string().min(1),
  ops: z.array(z.string()),
});
export type ResultCodes = z.infer<typeof ResultCodes>;

export const CodeExplanation = z.object({
  code: z.string(),
  title: z.string(),
  explanation: z.string(),
});
export type CodeExplanation = z.infer<typeof CodeExplanation>;

export const FailureExplanation = z.object({
  codes: ResultCodes,
  explanation: z.string(),
  preventable: z.boolean(),
  suggestedAction: z.string(),
  perCode: z.array(CodeExplanation),
});
export type FailureExplanation = z.infer<typeof FailureExplanation>;

const INNER_FAILURE_CODES = new Set(['tx_failed', 'tx_fee_bump_inner_failed']);
const SUCCESS_CODES = new Set(['tx_success', 'tx_fee_bump_inner_success', 'op_success']);
const UNKNOWN_ACTION = 'Look the code up in the Horizon result code reference before retrying.';

const describe = (code: string): CodeExplanation => {
  const info = lookupCode(code);
  return info
    ? { code, title: info.title, explanation: info.explanation }
    : { code, title: 'Unrecognised code', explanation: `Unrecognised result code ${code}.` };
};

const actionFor = (code: string): string => {
  if (Object.hasOwn(ACTION_BY_CODE, code)) {
    return ACTION_BY_CODE[code as keyof typeof ACTION_BY_CODE];
  }
  const info = lookupCode(code);
  return info ? CATEGORY_ACTION[info.category] : UNKNOWN_ACTION;
};

type Cause = { code: string; opIndex?: number };

const causesOf = ({ tx, ops }: ResultCodes): Cause[] => {
  if (!INNER_FAILURE_CODES.has(tx)) return [{ code: tx }];
  const failing = ops
    .map((code, opIndex) => ({ code, opIndex }))
    .filter(({ code }) => !SUCCESS_CODES.has(code));
  return failing.length > 0 ? failing : [{ code: tx }];
};

const sentenceFor = (cause: Cause, opCount: number): string => {
  const { explanation } = describe(cause.code);
  if (cause.opIndex === undefined) return `${cause.code}: ${explanation}`;
  return `Operation ${cause.opIndex + 1} of ${opCount} failed with ${cause.code}: ${explanation}`;
};

export const explainCodes = (codes: ResultCodes): FailureExplanation => {
  const causes = causesOf(codes);
  const primary = causes[0]?.code ?? codes.tx;
  const isSuccess = SUCCESS_CODES.has(codes.tx);
  const preventable = causes.some((cause) => lookupCode(cause.code)?.preventable === true);
  const actionCode = causes.find((cause) => lookupCode(cause.code)?.preventable)?.code ?? primary;
  const perCode = [...new Set([codes.tx, ...codes.ops])].map(describe);

  return {
    codes,
    explanation: isSuccess
      ? describe(codes.tx).explanation
      : causes.map((cause) => sentenceFor(cause, codes.ops.length)).join(' '),
    preventable,
    suggestedAction: isSuccess ? CATEGORY_ACTION.success : actionFor(actionCode),
    perCode,
  };
};
