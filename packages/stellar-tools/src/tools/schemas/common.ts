import { z } from 'zod';

export const AccountAddress = z
  .string()
  .regex(/^G[A-Z2-7]{55}$/, 'Expected a G... account address');
export const ContractAddress = z
  .string()
  .regex(/^C[A-Z2-7]{55}$/, 'Expected a C... contract address');
export const TxHash = z.string().regex(/^[0-9a-fA-F]{64}$/, 'Expected a 64 character hex hash');
export const WasmHash = z.string().regex(/^[0-9a-f]{64}$/);
export const FindingId = z.string().regex(/^[0-9a-f]{64}$/, 'Expected a 64 character finding id');
export const HomeDomain = z
  .string()
  .regex(/^(?=.{1,253}$)([a-z0-9-]+\.)+[a-z]{2,}$/i, 'Expected a bare domain like example.com');
export const AssetId = z
  .string()
  .regex(/^(XLM|native|[A-Za-z0-9]{1,12}:G[A-Z2-7]{55})$/, 'Expected XLM, native or CODE:ISSUER');
export const DecimalAmount = z.string().regex(/^\d+(\.\d{1,7})?$/, 'Expected a decimal amount');
export const Stroops = z.number().int().nonnegative();
export const LedgerSeq = z.number().int().nonnegative();
export const IsoTime = z.iso.datetime();
