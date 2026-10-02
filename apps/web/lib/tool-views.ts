import { AnchorStage, Finding, Plan, Summary, toolResult } from '@harness/schema';
import { z } from 'zod';

// Mirrors the output schemas of @harness/stellar-tools TOOL_SCHEMAS, which this branch predates.
// At merge, replace each entry of TOOL_VIEW_SCHEMAS with TOOL_SCHEMAS[name].output.

const AccountAddress = z.string().regex(/^G[A-Z2-7]{55}$/);
const ContractAddress = z.string().regex(/^C[A-Z2-7]{55}$/);
const TxHash = z.string().regex(/^[0-9a-fA-F]{64}$/);
const WasmHash = z.string().regex(/^[0-9a-f]{64}$/);
const DecimalAmount = z.string().regex(/^\d+(\.\d{1,7})?$/);
const Stroops = z.number().int().nonnegative();
const LedgerSeq = z.number().int().nonnegative();
const IsoTime = z.iso.datetime();

export const ResultCodesView = z.object({ tx: z.string().min(1), ops: z.array(z.string()) });
export type ResultCodesView = z.infer<typeof ResultCodesView>;

export const AccountView = z.object({
  address: AccountAddress,
  exists: z.boolean(),
  sequence: z.string().regex(/^\d+$/).nullable(),
  balances: z.array(
    z.object({ asset: z.string(), balance: DecimalAmount, limit: DecimalAmount.optional() }),
  ),
  thresholds: z.object({ low: z.number().int(), med: z.number().int(), high: z.number().int() }),
  signers: z.array(z.object({ key: z.string(), weight: z.number().int() })),
  flags: z.object({
    authRequired: z.boolean(),
    authRevocable: z.boolean(),
    authImmutable: z.boolean(),
    authClawbackEnabled: z.boolean(),
  }),
  homeDomain: z.string().nullable(),
  subentryCount: z.number().int().nonnegative(),
  numSponsoring: z.number().int().nonnegative(),
  numSponsored: z.number().int().nonnegative(),
});
export type AccountView = z.infer<typeof AccountView>;

export const TransactionView = z.object({
  hash: TxHash,
  ledger: LedgerSeq,
  createdAt: IsoTime,
  successful: z.boolean(),
  source: AccountAddress,
  feeCharged: Stroops,
  maxFee: Stroops,
  operationCount: z.number().int().nonnegative(),
  operations: z.array(z.object({ type: z.string(), source: AccountAddress.optional() })),
  memoType: z.enum(['none', 'text', 'id', 'hash', 'return']),
  timebounds: z.object({ minTime: IsoTime.nullable(), maxTime: IsoTime.nullable() }).nullable(),
  resultCodes: ResultCodesView,
  feeBump: z.object({ feeSource: AccountAddress, innerHash: TxHash }).nullable(),
});
export type TransactionView = z.infer<typeof TransactionView>;

export const FailureExplanationView = z.object({
  codes: ResultCodesView,
  explanation: z.string(),
  preventable: z.boolean(),
  suggestedAction: z.string(),
  perCode: z.array(z.object({ code: z.string(), title: z.string(), explanation: z.string() })),
});
export type FailureExplanationView = z.infer<typeof FailureExplanationView>;

export const TtlEntryView = z.object({
  present: z.boolean(),
  liveUntilLedgerSeq: LedgerSeq.nullable(),
  ledgersLeft: z.number().int().nullable(),
  daysLeft: z.number().nullable(),
  archived: z.boolean(),
});
export type TtlEntryView = z.infer<typeof TtlEntryView>;

export const ContractTtlView = z.object({
  contractId: ContractAddress,
  wasmHash: WasmHash.nullable(),
  instance: TtlEntryView,
  code: TtlEntryView,
  invocations: z.number().int().nonnegative().nullable(),
  snapshotLedger: LedgerSeq,
  ledgerCloseSeconds: z.number().positive(),
});
export type ContractTtlView = z.infer<typeof ContractTtlView>;

export const ProbeStageView = z.object({
  stage: AnchorStage,
  ok: z.boolean(),
  status: z.number().int().nullable(),
  ms: z.number().nonnegative(),
  error: z.string().nullable(),
});
export type ProbeStageView = z.infer<typeof ProbeStageView>;

export const AnchorProbeView = z.object({
  domain: z.string(),
  stages: z.array(ProbeStageView),
  findings: z.array(Finding),
  toml: z
    .object({
      signingKey: z.string().nullable(),
      accounts: z.array(z.string()),
      currencies: z.array(z.object({ code: z.string(), issuer: z.string().nullable() })),
      endpoints: z.object({
        transferServer: z.url().nullable(),
        transferServerSep24: z.url().nullable(),
        directPaymentServer: z.url().nullable(),
        anchorQuoteServer: z.url().nullable(),
        webAuthEndpoint: z.url().nullable(),
        kycServer: z.url().nullable(),
      }),
      networkPassphrase: z.string().nullable(),
      version: z.string().nullable(),
    })
    .nullable(),
  anchorTests: z
    .object({
      perSep: z.record(
        z.string(),
        z.object({
          passed: z.number().int().nonnegative(),
          failed: z.number().int().nonnegative(),
          names: z.array(z.string()),
        }),
      ),
    })
    .optional(),
});
export type AnchorProbeView = z.infer<typeof AnchorProbeView>;

export const FindingsPageView = z.object({
  rows: z.array(Finding),
  total: z.number().int().nonnegative(),
});
export type FindingsPageView = z.infer<typeof FindingsPageView>;

export const EcosystemView = z.object({
  query: z.string(),
  projects: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      description: z.string().nullable(),
      website: z.url().nullable(),
      scfAwarded: z.boolean(),
      scfRound: z.number().int().nullable(),
      contracts: z.array(ContractAddress),
    }),
  ),
  repos: z.array(
    z.object({
      name: z.string(),
      url: z.url(),
      description: z.string().nullable(),
      score: z.number().nullable(),
      mainnetContractId: ContractAddress.nullable(),
    }),
  ),
});
export type EcosystemView = z.infer<typeof EcosystemView>;

const SimulationView = z.object({
  contractId: ContractAddress,
  minResourceFeeStroops: Stroops,
  estimatedXlm: z.number().nonnegative(),
  unsignedXdr: z.string().min(1),
  footprint: z.object({ readOnly: z.array(z.string()), readWrite: z.array(z.string()) }),
});

export const ExtendTtlView = SimulationView.extend({
  days: z.number().int().positive(),
  extendToLedgers: z.number().int().positive(),
});
export type ExtendTtlView = z.infer<typeof ExtendTtlView>;

export const RestoreView = SimulationView.extend({ entries: z.enum(['instance', 'code', 'both']) });
export type RestoreView = z.infer<typeof RestoreView>;

export const PREFLIGHT_CHECKS = [
  'source_exists',
  'destination_exists',
  'source_trustline',
  'destination_trustline',
  'destination_authorized',
  'source_balance',
  'source_reserve',
  'destination_limit',
] as const;

export const PaymentPreflightView = z.object({
  ok: z.boolean(),
  blockers: z.array(z.object({ code: z.string(), fix: z.string() })),
  checks: z.array(
    z.object({ name: z.enum(PREFLIGHT_CHECKS), ok: z.boolean(), detail: z.string() }),
  ),
  alternative: Plan.optional(),
});
export type PaymentPreflightView = z.infer<typeof PaymentPreflightView>;

export const TOOL_VIEW_SCHEMAS = {
  getAccount: AccountView,
  getTransaction: TransactionView,
  explainFailure: FailureExplanationView,
  getContractTtl: ContractTtlView,
  probeAnchor: AnchorProbeView,
  queryFindings: FindingsPageView,
  getSummary: Summary,
  searchEcosystem: EcosystemView,
  simulateExtendTtl: ExtendTtlView,
  simulateRestore: RestoreView,
  buildPaymentPreflight: PaymentPreflightView,
  planFix: Plan,
} as const;

export type ToolViewName = keyof typeof TOOL_VIEW_SCHEMAS;
export type ToolView<TName extends ToolViewName> = z.infer<(typeof TOOL_VIEW_SCHEMAS)[TName]>;

export const ToolEnvelope = toolResult(z.unknown());
export type ToolEnvelope = z.infer<typeof ToolEnvelope>;
