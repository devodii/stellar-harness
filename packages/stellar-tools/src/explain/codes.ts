import { isPreventableCode } from '@harness/schema';
import type { CodeEntry, CodeInfo } from './code-info';
import { OP_ACCOUNT_CODES } from './codes/op-account';
import { OP_COMMON_CODES } from './codes/op-common';
import { OP_OFFER_CODES } from './codes/op-offer';
import { OP_PAYMENT_CODES } from './codes/op-payment';
import { OP_POOL_CODES } from './codes/op-pool';
import { OP_SOROBAN_CODES } from './codes/op-soroban';
import { OP_SPONSORSHIP_CODES } from './codes/op-sponsorship';
import { TX_CODES } from './codes/tx';

const OP_CODES = {
  ...OP_COMMON_CODES,
  ...OP_PAYMENT_CODES,
  ...OP_OFFER_CODES,
  ...OP_ACCOUNT_CODES,
  ...OP_SPONSORSHIP_CODES,
  ...OP_POOL_CODES,
  ...OP_SOROBAN_CODES,
};

const ALL_CODES = { ...TX_CODES, ...OP_CODES };

export type TxResultCode = keyof typeof TX_CODES;
export type OpResultCode = keyof typeof OP_CODES;
export type ResultCode = keyof typeof ALL_CODES;

const withPreventable = <T extends Record<string, CodeEntry>>(table: T) =>
  Object.fromEntries(
    Object.entries(table).map(([code, info]) => [
      code,
      { ...info, preventable: isPreventableCode(code) },
    ]),
  ) as { [K in keyof T]: CodeInfo };

export const RESULT_CODES = withPreventable(ALL_CODES);

export const TX_RESULT_CODES = Object.keys(TX_CODES) as TxResultCode[];
export const OP_RESULT_CODES = Object.keys(OP_CODES) as OpResultCode[];

export const isResultCode = (code: string): code is ResultCode => Object.hasOwn(RESULT_CODES, code);

export const lookupCode = (code: string): CodeInfo | null =>
  isResultCode(code) ? RESULT_CODES[code] : null;
