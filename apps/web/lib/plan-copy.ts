import type { PlanStepKind } from '@harness/schema';

export const SIMULATE_HINT =
  'Simulated with Soroban RPC simulateTransaction: the network computes the cost, nothing is signed or submitted.';

export const HANDOFF_HINT =
  'Who must act and what it would cost; the harness hands this over and does not execute it.';

export const KIND_HINT: Partial<Record<PlanStepKind, string>> = { simulate: SIMULATE_HINT };
