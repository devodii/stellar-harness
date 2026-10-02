import { DEFAULT_NETWORK, type Network, type Summary } from '@harness/schema';
import { truncateMiddle } from './format';
import { MAINNET_FALLBACKS } from './mainnet-fallbacks';
import { hasScanData, windowDays } from './summary';
import { TESTNET_FALLBACKS } from './testnet-fallbacks';

export interface ChatSuggestion {
  id: string;
  label: string;
  prompt: string;
}

export interface NetworkFallbacks {
  failedTxHash: string;
  anchorDomain: string;
  usdcHolder: string;
  noUsdcTrustline: string;
  contract: string;
  usdcIssuer: string;
}

export const FALLBACKS: Record<Network, NetworkFallbacks> = {
  mainnet: MAINNET_FALLBACKS,
  testnet: TESTNET_FALLBACKS,
};

const subjectsFrom = (summary: Summary | null, network: Network) => {
  const fallbacks = FALLBACKS[network];
  const scanned =
    summary && summary.snapshot.network === network && hasScanData(summary) ? summary : null;
  const anchor = scanned?.anchors.failing[0]?.domain;
  const contract = scanned?.contracts.scfFunded.projects.find((project) => project.contracts[0])
    ?.contracts[0];
  const days = scanned ? windowDays(scanned) : 0;
  return {
    failedTxHash: fallbacks.failedTxHash,
    anchorDomain: anchor ?? fallbacks.anchorDomain,
    from: fallbacks.usdcHolder,
    to: fallbacks.noUsdcTrustline,
    contract: contract ?? fallbacks.contract,
    windowDays: days > 0 ? days : 7,
  };
};

export const SCF_LIFETIME_QUESTION =
  'Which SCF-funded contracts are archived or expiring within 30 days, and what would restoring them cost?';

const SIMULATE_THEN_HAND_OFF =
  'Simulate the restore or TTL extension for the most active one, then say who would have to act and what it would cost.';

const contractLifetimeSuggestion = (network: Network, contract: string): ChatSuggestion =>
  network === 'mainnet'
    ? {
        id: 'scf-archival',
        label: SCF_LIFETIME_QUESTION,
        prompt: `${SCF_LIFETIME_QUESTION} ${SIMULATE_THEN_HAND_OFF}`,
      }
    : {
        id: 'ttl-expiry',
        label: `Does ${truncateMiddle(contract)} expire within 30d?`,
        prompt: `Check the TTL of ${network} contract ${contract}. Is it archived or expiring within 30 days, and what would extending it cost? Simulate it, then say who would have to act.`,
      };

export const buildSuggestions = (
  summary: Summary | null,
  network: Network = DEFAULT_NETWORK,
): ChatSuggestion[] => {
  const s = subjectsFrom(summary, network);
  const on = network === DEFAULT_NETWORK ? '' : ` on ${network}`;
  const which = network === DEFAULT_NETWORK ? '' : `${network} `;
  return [
    {
      id: 'failed-tx',
      label: `Why did ${which}tx ${truncateMiddle(s.failedTxHash)} fail?`,
      prompt: `Why did ${which}transaction ${s.failedTxHash} fail, and what would you have done?`,
    },
    contractLifetimeSuggestion(network, s.contract),
    {
      id: 'anchor',
      label: `Is ${s.anchorDomain} conformant?`,
      prompt: `Check whether ${s.anchorDomain} is conformant${on}`,
    },
    {
      id: 'preflight',
      label: `Pre-flight a 25 USDC payment${on}`,
      prompt: `Pre-flight a 25 USDC payment${on} from ${s.from} to ${s.to}`,
    },
    {
      id: 'clusters',
      label: `Preventable failure clusters, last ${s.windowDays}d`,
      prompt: `Show me the preventable failure clusters${on} from the last ${s.windowDays} days and who they belong to`,
    },
    {
      id: 'rent',
      label: `12 month rent for ${truncateMiddle(s.contract)}`,
      prompt: `What does it cost to keep ${which && `${which}contract `}${s.contract} alive for 12 months?`,
    },
  ];
};

export const planFixPrompt = (findingId: string, type: string, subject: string): string =>
  `Plan a fix for finding ${findingId} (${type} on ${subject}). Run planFix with findingId ${findingId} and walk me through the plan.`;
