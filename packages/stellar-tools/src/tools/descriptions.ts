import type { ToolName } from './names';

export const TOOL_DESCRIPTIONS: Record<ToolName, string> = {
  getAccount:
    'Read a mainnet account from Horizon: sequence, balances, thresholds, signers, flags, home domain and sponsorship counts.',
  getTransaction:
    'Read a mainnet transaction by hash: ledger, source, fee, operations, timebounds and decoded result codes.',
  explainFailure:
    'Explain why a transaction failed in plain language from its hash, result XDR or result codes, with whether it was preventable and the suggested action.',
  getContractTtl:
    'Read a contract instance and code TTL: live until ledger, days left, archived flags, wasm hash and invocation count.',
  probeAnchor:
    'Probe an anchor domain for conformance: stellar.toml, accounts, SEP endpoints, /info, SEP-10, SEP-38, SEP-31, CORS and optionally stellar-anchor-tests. Read only.',
  queryFindings:
    'Query scanner findings by type, severity, subject or tags. Returns matching rows and the total.',
  getSummary:
    'Read the latest scan summary: contracts, failures, anchors, rent and GitHub numbers with the snapshot they were measured at.',
  searchEcosystem:
    'Search Stellar ecosystem projects and repositories (stellarlight.xyz). In the product, Raven, SDF MCP server, is the fuller knowledge gateway and would be wired here.',
  simulateExtendTtl:
    'Simulate extending a contract instance and code TTL by N days. Returns the resource fee, estimated XLM and unsigned XDR for display. Nothing is submitted.',
  simulateRestore:
    'Simulate restoring an archived contract instance or code. Returns the resource fee, estimated XLM and unsigned XDR for display. Nothing is submitted.',
  buildPaymentPreflight:
    'Pre-flight a payment: check accounts, trustlines, authorization, balance, reserve and limits. Returns blockers with fixes and an alternative plan when blocked.',
  planFix:
    'Build a step by step fix plan for a finding, naming the tools and arguments for each step, with the policy boundary when approval is required.',
};
