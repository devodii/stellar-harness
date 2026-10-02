import type { Finding } from '@harness/schema';
import { contractRef, evidenceNumber, evidenceString } from '../evidence';
import { build, notice, type PlanDraft, type Recipe, read, simulate, submit } from '../step';

export const EXTEND_DAYS = 365;

const readTtl = (contractId: string) =>
  read('getContractTtl', 'Read instance and code TTL, wasm hash and invocation count.', {
    contractId,
  });

const extendSteps = (contractId: string) => [
  simulate(
    'simulateExtendTtl',
    `Simulate extending the instance and code TTL by ${EXTEND_DAYS} days to get the resource fee.`,
    { contractId, days: EXTEND_DAYS },
  ),
  build('Build the unsigned ExtendFootprintTTL transaction from the simulation.', {
    operation: 'extendFootprintTtl',
    contractId,
    days: EXTEND_DAYS,
  }),
  submit('Submit the extension once the policy owner approves and signs.'),
];

const restoreSteps = (contractId: string, entries: 'instance' | 'code') => [
  simulate('simulateRestore', `Simulate RestoreFootprint for the archived ${entries}.`, {
    contractId,
    entries,
  }),
  build('Build the unsigned RestoreFootprint transaction from the simulation.', {
    operation: 'restoreFootprint',
    contractId,
    entries,
  }),
  submit('Submit the restore once the policy owner approves and signs.'),
];

const twelveMonthCost = (finding: Finding) =>
  evidenceNumber(finding.evidence, 'xlm12m', 'estimatedXlm', 'rentXlm12m');

const withCost = (draft: PlanDraft, finding: Finding): PlanDraft => {
  const estimatedCostXlm = twelveMonthCost(finding);
  return estimatedCostXlm === undefined ? draft : { ...draft, estimatedCostXlm };
};

const expiring: Recipe = (finding) => {
  const contractId = contractRef(finding);
  return withCost(
    {
      title: `Extend TTL for ${contractId}`,
      steps: [readTtl(contractId), ...extendSteps(contractId)],
    },
    finding,
  );
};

export const CONTRACT_RECIPES = {
  CONTRACT_INSTANCE_ARCHIVED: (finding) => {
    const contractId = contractRef(finding);
    return {
      title: `Restore archived instance ${contractId}`,
      steps: [
        readTtl(contractId),
        ...restoreSteps(contractId, 'instance'),
        simulate(
          'simulateExtendTtl',
          `After the restore, simulate a ${EXTEND_DAYS} day extension so it does not archive again.`,
          { contractId, days: EXTEND_DAYS },
        ),
      ],
    };
  },
  CONTRACT_CODE_ARCHIVED: (finding) => {
    const contractId = contractRef(finding);
    const wasmHash = evidenceString(finding.evidence, 'wasmHash', 'wasm') ?? finding.subject;
    return {
      title: `Restore archived contract code ${wasmHash}`,
      steps: [
        readTtl(contractId),
        read('queryFindings', 'List other findings on this contract and its wasm family.', {
          subject: finding.subject,
        }),
        ...restoreSteps(contractId, 'code'),
        simulate('simulateExtendTtl', `Simulate a ${EXTEND_DAYS} day extension after restore.`, {
          contractId,
          days: EXTEND_DAYS,
        }),
      ],
    };
  },
  CONTRACT_INSTANCE_EXPIRING_30D: expiring,
  CONTRACT_INSTANCE_EXPIRING_90D: expiring,
  CONTRACT_LIVE_IDLE: (finding) => {
    const contractId = contractRef(finding);
    return withCost(
      {
        title: `Decide whether to keep idle contract ${contractId}`,
        steps: [
          readTtl(contractId),
          simulate(
            'simulateExtendTtl',
            `Price keeping it alive for ${EXTEND_DAYS} days before deciding to extend or let it archive.`,
            { contractId, days: EXTEND_DAYS },
          ),
          read('queryFindings', 'Check for other findings on the same contract.', {
            subject: finding.subject,
          }),
        ],
      },
      finding,
    );
  },
  CONTRACT_UNVERIFIED_SOURCE: (finding) => {
    const contractId = contractRef(finding);
    return {
      title: `Get verified source published for ${contractId}`,
      steps: [
        readTtl(contractId),
        read('searchEcosystem', 'Look for the project and repository behind this contract.', {
          query: contractId,
        }),
        notice('Draft a request to the maintainers to publish verified source (SEP-55/58).', {
          contractId,
          fix: finding.suggestedAction,
        }),
      ],
    };
  },
  CONTRACT_RENT_12M: (finding) => ({
    ...expiring(finding),
    title: `Fund 12 months of rent for ${contractRef(finding)}`,
  }),
} satisfies Record<string, Recipe>;
