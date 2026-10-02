export const TOOL_NAMES = [
  'getAccount',
  'getTransaction',
  'explainFailure',
  'getContractTtl',
  'probeAnchor',
  'queryFindings',
  'getSummary',
  'searchEcosystem',
  'simulateExtendTtl',
  'simulateRestore',
  'buildPaymentPreflight',
  'planFix',
] as const;
export type ToolName = (typeof TOOL_NAMES)[number];

export const isToolName = (name: string): name is ToolName =>
  (TOOL_NAMES as readonly string[]).includes(name);
