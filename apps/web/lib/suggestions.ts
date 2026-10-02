import type { Summary } from '@harness/schema';
import { truncateMiddle } from './format';
import { MAINNET_FALLBACKS } from './mainnet-fallbacks';
import { hasScanData, windowDays } from './summary';

export interface ChatSuggestion {
  id: string;
  label: string;
  prompt: string;
}

const subjectsFrom = (summary: Summary | null) => {
  const scanned = summary && hasScanData(summary) ? summary : null;
  const anchor = scanned?.anchors.failing[0]?.domain;
  const contract = scanned?.contracts.scfFunded.projects.find((project) => project.contracts[0])
    ?.contracts[0];
  const days = scanned ? windowDays(scanned) : 0;
  return {
    failedTxHash: MAINNET_FALLBACKS.failedTxHash,
    anchorDomain: anchor ?? MAINNET_FALLBACKS.failingAnchorDomain,
    from: MAINNET_FALLBACKS.usdcHolder,
    to: MAINNET_FALLBACKS.noUsdcTrustline,
    contract: contract ?? MAINNET_FALLBACKS.contract,
    windowDays: days > 0 ? days : 7,
  };
};

export const buildSuggestions = (summary: Summary | null): ChatSuggestion[] => {
  const s = subjectsFrom(summary);
  return [
    {
      id: 'failed-tx',
      label: `Why did tx ${truncateMiddle(s.failedTxHash)} fail?`,
      prompt: `Why did transaction ${s.failedTxHash} fail, and what would you have done?`,
    },
    {
      id: 'scf-archival',
      label: 'SCF contracts archived or expiring in 30d',
      prompt: 'Which SCF-funded contracts are archived or expiring within 30 days?',
    },
    {
      id: 'anchor',
      label: `Is ${s.anchorDomain} conformant?`,
      prompt: `Check whether ${s.anchorDomain} is conformant`,
    },
    {
      id: 'preflight',
      label: 'Pre-flight a 25 USDC payment',
      prompt: `Pre-flight a 25 USDC payment from ${s.from} to ${s.to}`,
    },
    {
      id: 'clusters',
      label: `Preventable failure clusters, last ${s.windowDays}d`,
      prompt: `Show me the preventable failure clusters from the last ${s.windowDays} days and who they belong to`,
    },
    {
      id: 'rent',
      label: `12 month rent for ${truncateMiddle(s.contract)}`,
      prompt: `What does it cost to keep ${s.contract} alive for 12 months?`,
    },
  ];
};

export const planFixPrompt = (findingId: string, type: string, subject: string): string =>
  `Plan a fix for finding ${findingId} (${type} on ${subject}). Run planFix with findingId ${findingId} and walk me through the plan.`;
