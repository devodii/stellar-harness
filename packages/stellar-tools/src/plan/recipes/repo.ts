import type { FindingType } from '@harness/schema';
import { evidenceString } from '../evidence';
import { type Recipe, read } from '../step';

type RepoFindingType = Extract<FindingType, `REPO_${string}`>;

const repoRecipe =
  (title: string, relatedTypes: FindingType[]): Recipe =>
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
    };
  };

export const REPO_RECIPES = {
  REPO_TTL_ISSUE: repoRecipe('Triage TTL issue', [
    'CONTRACT_INSTANCE_ARCHIVED',
    'CONTRACT_CODE_ARCHIVED',
    'CONTRACT_INSTANCE_EXPIRING_30D',
  ]),
  REPO_TX_FAILURE_ISSUE: repoRecipe('Triage transaction failure issue', [
    'TX_BAD_SEQ_CLUSTER',
    'TX_INSUFFICIENT_FEE_CLUSTER',
    'OP_NO_TRUST_CLUSTER',
    'OP_UNDERFUNDED_CLUSTER',
  ]),
  REPO_ANCHOR_CONFORMANCE_ISSUE: repoRecipe('Triage anchor conformance issue', [
    'ANCHOR_TESTS_FAILED',
    'ANCHOR_SEP10_CHALLENGE_FAILS',
    'ANCHOR_INFO_UNREADABLE',
  ]),
} satisfies Record<RepoFindingType, Recipe>;
