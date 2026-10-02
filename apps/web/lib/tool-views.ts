import { toolResult } from '@harness/schema';
import {
  BuildPaymentPreflightOutput,
  ExplainFailureOutput,
  GetAccountOutput,
  GetContractTtlOutput,
  GetNetworkStatusOutput,
  GetTransactionOutput,
  ProbeAnchorOutput,
  ProbeStage,
  QueryFindingsOutput,
  ResultCodes,
  SearchEcosystemOutput,
  SimulateExtendTtlOutput,
  SimulateRestoreOutput,
  TOOL_SCHEMAS,
  type ToolName,
  type ToolSchemas,
  TtlEntry,
} from '@harness/stellar-tools/schemas';
import { z } from 'zod';

export { PREFLIGHT_CHECKS } from '@harness/stellar-tools/schemas';

export const ResultCodesView = ResultCodes;
export type ResultCodesView = z.infer<typeof ResultCodesView>;
export const AccountView = GetAccountOutput;
export type AccountView = z.infer<typeof AccountView>;
export const TransactionView = GetTransactionOutput;
export type TransactionView = z.infer<typeof TransactionView>;
export const FailureExplanationView = ExplainFailureOutput;
export type FailureExplanationView = z.infer<typeof FailureExplanationView>;
export const TtlEntryView = TtlEntry;
export type TtlEntryView = z.infer<typeof TtlEntryView>;
export const ContractTtlView = GetContractTtlOutput;
export type ContractTtlView = z.infer<typeof ContractTtlView>;
export const ProbeStageView = ProbeStage;
export type ProbeStageView = z.infer<typeof ProbeStageView>;
export const AnchorProbeView = ProbeAnchorOutput;
export type AnchorProbeView = z.infer<typeof AnchorProbeView>;
export const FindingsPageView = QueryFindingsOutput;
export type FindingsPageView = z.infer<typeof FindingsPageView>;
export const EcosystemView = SearchEcosystemOutput;
export type EcosystemView = z.infer<typeof EcosystemView>;
export const ExtendTtlView = SimulateExtendTtlOutput;
export type ExtendTtlView = z.infer<typeof ExtendTtlView>;
export const RestoreView = SimulateRestoreOutput;
export type RestoreView = z.infer<typeof RestoreView>;
export const NetworkStatusView = GetNetworkStatusOutput;
export type NetworkStatusView = z.infer<typeof NetworkStatusView>;
export const PaymentPreflightView = BuildPaymentPreflightOutput;
export type PaymentPreflightView = z.infer<typeof PaymentPreflightView>;

export const TOOL_VIEW_SCHEMAS: { [TName in ToolName]: ToolSchemas[TName]['output'] } =
  Object.fromEntries(
    Object.entries(TOOL_SCHEMAS).map(([name, schemas]) => [name, schemas.output]),
  ) as { [TName in ToolName]: ToolSchemas[TName]['output'] };

export type ToolViewName = ToolName;
export type ToolView<TName extends ToolViewName> = z.infer<ToolSchemas[TName]['output']>;

export const ToolEnvelope = toolResult(z.unknown());
export type ToolEnvelope = z.infer<typeof ToolEnvelope>;
