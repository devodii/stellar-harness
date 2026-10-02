import type { FindingType, RequiredAuthority } from '@harness/schema';
import { evidenceString } from '../evidence';
import { handoff, type Recipe, read } from '../step';

type RepoFindingType = Extract<FindingType, `REPO_${string}`>;

const repoRecipe =
  (
    title: string,
    relatedTypes: FindingType[],
    requiredAuthority: RequiredAuthority,
    summary: string,
  ): Recipe =>
  (finding) => {
    const repo = evidenceString(finding.evidence, 'repo') ?? finding.subject;
    const issueTitle = evidenceString(finding.evidence, 'title');
    return {
      title: `${title}: ${repo}`,
      steps: [
        read('searchEcosystem', 'Find the project and repository this issue belongs to.', {
          query: repo,
        }),
        read('queryFindings', 'List related network findings to check the issue against.', {
          type: relatedTypes,
          limit: 20,
        }),
        ...(issueTitle
          ? [
              read('searchEcosystem', 'Search the ecosystem for other reports of the same issue.', {
                query: issueTitle,
              }),
            ]
          : []),
      ],
      handoff: handoff(requiredAuthority, summary),
    };
  };

export const REPO_RECIPES = {
  REPO_TTL_ISSUE: repoRecipe(
    'Triage TTL issue',
    ['CONTRACT_INSTANCE_ARCHIVED', 'CONTRACT_CODE_ARCHIVED', 'CONTRACT_INSTANCE_EXPIRING_30D'],
    'contract_admin',
    'The project maintainers fix the TTL handling the issue reports: extend TTL on write and restore archived entries before invoking.',
  ),
  REPO_TX_FAILURE_ISSUE: repoRecipe(
    'Triage transaction failure issue',
    [
      'TX_BAD_SEQ_CLUSTER',
      'TX_INSUFFICIENT_FEE_CLUSTER',
      'OP_NO_TRUST_CLUSTER',
      'OP_UNDERFUNDED_CLUSTER',
    ],
    'account_signer',
    'The project maintainers fix how their client builds and signs transactions so the reported result code stops recurring.',
  ),
  REPO_ANCHOR_CONFORMANCE_ISSUE: repoRecipe(
    'Triage anchor conformance issue',
    ['ANCHOR_TESTS_FAILED', 'ANCHOR_SEP10_CHALLENGE_FAILS', 'ANCHOR_INFO_UNREADABLE'],
    'anchor_operator',
    'The anchor operator fixes the conformance failure the issue reports and reruns stellar-anchor-tests.',
  ),
} satisfies Record<RepoFindingType, Recipe>;
