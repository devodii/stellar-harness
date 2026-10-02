import type { Finding } from '@harness/schema';
import { contractRef, evidenceNumber, evidenceString } from '../evidence';
import { handoff, type Recipe, read, simulate } from '../step';

export const EXTEND_DAYS = 365;

const NO_ADMIN = 'no admin signature is needed';

const readTtl = (contractId: string) =>
  read('getContractTtl', 'Read instance and code TTL, wasm hash and invocation count.', {
    contractId,
  });

const simulateExtend = (contractId: string, description: string) =>
  simulate('simulateExtendTtl', description, { contractId, days: EXTEND_DAYS });

const simulateRestore = (contractId: string, entries: 'instance' | 'code') =>
  simulate(
    'simulateRestore',
    `Simulate RestoreFootprint for the archived ${entries} to get the resource fee.`,
    { contractId, entries },
  );

const twelveMonthCost = (finding: Finding) =>
  evidenceNumber(finding.evidence, 'xlm12m', 'estimatedXlm', 'rentXlm12m');

const extendRecipe =
  (title: (contractId: string) => string, summary: string): Recipe =>
  (finding) => {
    const contractId = contractRef(finding);
    return {
      title: title(contractId),
      steps: [
        readTtl(contractId),
        simulateExtend(
          contractId,
          `Simulate extending the instance and code TTL by ${EXTEND_DAYS} days to get the resource fee.`,
        ),
      ],
      handoff: handoff('any_payer', summary, twelveMonthCost(finding)),
    };
  };

const expiring = extendRecipe(
  (contractId) => `Extend TTL for ${contractId}`,
  `Any account can pay to extend the instance and code TTL by ${EXTEND_DAYS} days (ExtendFootprintTTL) at the simulated fee; ${NO_ADMIN}.`,
);

export const CONTRACT_RECIPES = {
  CONTRACT_INSTANCE_ARCHIVED: (finding) => {
    const contractId = contractRef(finding);
    return {
      title: `Restore archived instance ${contractId}`,
      steps: [
        readTtl(contractId),
        simulateRestore(contractId, 'instance'),
        simulateExtend(
          contractId,
          `Simulate a ${EXTEND_DAYS} day extension after the restore so it does not archive again.`,
        ),
      ],
      handoff: handoff(
        'any_payer',
        `Any account can pay to restore the archived instance (RestoreFootprint) and extend it by ${EXTEND_DAYS} days at the simulated fees; ${NO_ADMIN}.`,
      ),
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
        simulateRestore(contractId, 'code'),
        simulateExtend(contractId, `Simulate a ${EXTEND_DAYS} day extension after the restore.`),
      ],
      handoff: handoff(
        'any_payer',
        `Any account can pay to restore the archived wasm code (RestoreFootprint) and extend it by ${EXTEND_DAYS} days at the simulated fees; ${NO_ADMIN}.`,
      ),
    };
  },
  CONTRACT_INSTANCE_EXPIRING_30D: expiring,
  CONTRACT_INSTANCE_EXPIRING_90D: expiring,
  CONTRACT_LIVE_IDLE: (finding) => {
    const contractId = contractRef(finding);
    return {
      title: `Decide whether to keep idle contract ${contractId}`,
      steps: [
        readTtl(contractId),
        simulateExtend(
          contractId,
          `Price keeping it alive for ${EXTEND_DAYS} days before deciding to extend or let it archive.`,
        ),
        read('queryFindings', 'Check for other findings on the same contract.', {
          subject: finding.subject,
        }),
      ],
      handoff: handoff(
        'contract_admin',
        `The contract admin decides whether the idle contract is still needed; if it is, any account can pay the simulated fee to extend it by ${EXTEND_DAYS} days.`,
        twelveMonthCost(finding),
      ),
    };
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
      ],
      handoff: handoff(
        'contract_admin',
        'The contract maintainers publish the source and a SEP-55 build attestation so the deployed wasm hash can be verified.',
      ),
    };
  },
  CONTRACT_RENT_12M: extendRecipe(
    (contractId) => `Fund 12 months of rent for ${contractId}`,
    `Any account can prepay 12 months of rent by extending the instance and code TTL by ${EXTEND_DAYS} days at the simulated fee; ${NO_ADMIN}.`,
  ),
} satisfies Record<string, Recipe>;
