import type { z } from 'zod';
import type { ToolName } from './names';
import { GetAccountInput, GetAccountOutput } from './schemas/account';
import { ProbeAnchorInput, ProbeAnchorOutput } from './schemas/anchor';
import { GetContractTtlInput, GetContractTtlOutput } from './schemas/contract';
import { SearchEcosystemInput, SearchEcosystemOutput } from './schemas/ecosystem';
import { ExplainFailureInput, ExplainFailureOutput } from './schemas/failure';
import {
  GetSummaryInput,
  GetSummaryOutput,
  QueryFindingsInput,
  QueryFindingsOutput,
} from './schemas/findings';
import { GetNetworkStatusInput, GetNetworkStatusOutput } from './schemas/network';
import { BuildPaymentPreflightInput, BuildPaymentPreflightOutput } from './schemas/payment';
import { PlanFixInput, PlanFixOutput } from './schemas/plan';
import {
  SimulateExtendTtlInput,
  SimulateExtendTtlOutput,
  SimulateRestoreInput,
  SimulateRestoreOutput,
} from './schemas/simulate';
import { GetTransactionInput, GetTransactionOutput } from './schemas/transaction';

export { FailureExplanation, ResultCodes } from '../explain/explain';
export type { ToolName } from './names';
export * from './schemas/account';
export * from './schemas/anchor';
export * from './schemas/common';
export * from './schemas/contract';
export * from './schemas/ecosystem';
export * from './schemas/failure';
export * from './schemas/findings';
export * from './schemas/network';
export * from './schemas/payment';
export * from './schemas/plan';
export * from './schemas/simulate';
export * from './schemas/transaction';

export const TOOL_SCHEMAS = {
  getAccount: { input: GetAccountInput, output: GetAccountOutput },
  getTransaction: { input: GetTransactionInput, output: GetTransactionOutput },
  explainFailure: { input: ExplainFailureInput, output: ExplainFailureOutput },
  getContractTtl: { input: GetContractTtlInput, output: GetContractTtlOutput },
  probeAnchor: { input: ProbeAnchorInput, output: ProbeAnchorOutput },
  queryFindings: { input: QueryFindingsInput, output: QueryFindingsOutput },
  getSummary: { input: GetSummaryInput, output: GetSummaryOutput },
  getNetworkStatus: { input: GetNetworkStatusInput, output: GetNetworkStatusOutput },
  searchEcosystem: { input: SearchEcosystemInput, output: SearchEcosystemOutput },
  simulateExtendTtl: { input: SimulateExtendTtlInput, output: SimulateExtendTtlOutput },
  simulateRestore: { input: SimulateRestoreInput, output: SimulateRestoreOutput },
  buildPaymentPreflight: { input: BuildPaymentPreflightInput, output: BuildPaymentPreflightOutput },
  planFix: { input: PlanFixInput, output: PlanFixOutput },
} satisfies Record<ToolName, { input: z.ZodType; output: z.ZodType }>;

export type ToolSchemas = typeof TOOL_SCHEMAS;
export type ToolInput<TName extends ToolName> = z.infer<ToolSchemas[TName]['input']>;
export type ToolOutput<TName extends ToolName> = z.infer<ToolSchemas[TName]['output']>;
