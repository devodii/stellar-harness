import type { Finding } from '@harness/schema';
import type * as React from 'react';
import type { z } from 'zod';
import { AccountView } from '@/components/account-view';
import { AnchorProbeView } from '@/components/anchor-probe-view';
import { ContractTtlView } from '@/components/contract-ttl-view';
import { EcosystemView } from '@/components/ecosystem-view';
import { FailureExplanationView } from '@/components/failure-explanation-view';
import { FindingsTable } from '@/components/findings-table';
import { JsonView } from '@/components/json-view';
import { PaymentPreflightView } from '@/components/payment-preflight-view';
import { PlanView } from '@/components/plan-view';
import { SimulationCostView } from '@/components/simulation-cost-view';
import { SummaryView } from '@/components/summary-view';
import { ToolErrorRow } from '@/components/tool-error-row';
import { TransactionView } from '@/components/transaction-view';
import type { PlanDecision } from './plan-approval';
import { TOOL_VIEW_SCHEMAS, ToolEnvelope, type ToolViewName } from './tool-views';

export interface RenderContext {
  decisions: Record<string, PlanDecision>;
  onDecide?: (planId: string, decision: PlanDecision) => void;
  onFinding?: (finding: Finding) => void;
  busy?: boolean;
}

export interface ToolRenderer {
  render: (output: unknown, ctx: RenderContext) => React.ReactNode | null;
}

export const defineRenderer = <TSchema extends z.ZodType>(
  schema: TSchema,
  View: React.ComponentType<{ data: z.output<TSchema>; ctx: RenderContext }>,
): ToolRenderer => ({
  render: (output, ctx) => {
    const parsed = schema.safeParse(output);
    return parsed.success ? <View data={parsed.data} ctx={ctx} /> : null;
  },
});

const S = TOOL_VIEW_SCHEMAS;

export const TOOL_RENDERERS = {
  getAccount: defineRenderer(S.getAccount, ({ data }) => <AccountView account={data} />),
  getTransaction: defineRenderer(S.getTransaction, ({ data }) => (
    <TransactionView transaction={data} />
  )),
  explainFailure: defineRenderer(S.explainFailure, ({ data }) => (
    <FailureExplanationView explanation={data} />
  )),
  getContractTtl: defineRenderer(S.getContractTtl, ({ data }) => <ContractTtlView ttl={data} />),
  probeAnchor: defineRenderer(S.probeAnchor, ({ data }) => <AnchorProbeView probe={data} />),
  queryFindings: defineRenderer(S.queryFindings, ({ data, ctx }) => (
    <div className="space-y-1">
      <FindingsTable rows={data.rows} onRowClick={ctx.onFinding} clientPageSize={8} />
      {data.total > data.rows.length && (
        <p className="font-mono text-xs text-muted-foreground">
          showing {data.rows.length} of {data.total}
        </p>
      )}
    </div>
  )),
  getSummary: defineRenderer(S.getSummary, ({ data }) => <SummaryView summary={data} />),
  searchEcosystem: defineRenderer(S.searchEcosystem, ({ data }) => (
    <EcosystemView ecosystem={data} />
  )),
  simulateExtendTtl: defineRenderer(S.simulateExtendTtl, ({ data }) => (
    <SimulationCostView simulation={data} />
  )),
  simulateRestore: defineRenderer(S.simulateRestore, ({ data }) => (
    <SimulationCostView simulation={data} />
  )),
  buildPaymentPreflight: defineRenderer(S.buildPaymentPreflight, ({ data, ctx }) => (
    <PaymentPreflightView
      preflight={data}
      decision={data.alternative ? ctx.decisions[data.alternative.planId] : undefined}
      onDecide={ctx.onDecide}
      disabled={ctx.busy}
    />
  )),
  planFix: defineRenderer(S.planFix, ({ data, ctx }) => (
    <PlanView
      plan={data}
      decision={ctx.decisions[data.planId]}
      onDecide={ctx.onDecide}
      disabled={ctx.busy}
    />
  )),
} satisfies Record<ToolViewName, ToolRenderer>;

const isRegistered = (name: string): name is ToolViewName => Object.hasOwn(TOOL_RENDERERS, name);

export function ToolOutput({
  toolName,
  output,
  ctx,
}: {
  toolName: string;
  output: unknown;
  ctx: RenderContext;
}) {
  const envelope = ToolEnvelope.safeParse(output);
  if (envelope.success && !envelope.data.ok) {
    return <ToolErrorRow code={envelope.data.error.code} message={envelope.data.error.message} />;
  }
  const data = envelope.success && envelope.data.ok ? envelope.data.data : output;
  const rendered = isRegistered(toolName) ? TOOL_RENDERERS[toolName].render(data, ctx) : null;
  return rendered ?? <JsonView value={data} />;
}
