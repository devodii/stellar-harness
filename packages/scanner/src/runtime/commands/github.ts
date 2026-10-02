import { setTimeout as sleep } from 'node:timers/promises';
import {
  GITHUB_CSV_COLUMNS,
  type GithubIssueRow,
  ISSUE_QUERIES,
  runGithubCensus,
  summarizeGithub,
} from '../../census/github/index';
import { fetchOrgReposMatching, fetchScoredRepos } from '../../census/github/repos';
import { writeCensusRecord, writeExport } from '../artifacts';
import type { ScanContext } from '../context';
import { measure } from './measure';

export const REPO_SCORE_FLOOR = 40;

export const GITHUB_NETWORK_SKIP =
  'GitHub issues are network independent; census 5 runs on mainnet only';

const skipGithub = async (ctx: ScanContext, reason: string) => {
  ctx.log(`[github] ${reason}; census 5 skipped`);
  await writeCensusRecord(ctx.options.dataDir, {
    run: {
      census: 'github',
      wallMs: 0,
      requests: 0,
      networkCalls: 0,
      cachedHits: 0,
      gaps: 0,
      skipped: reason,
    },
    summary: null,
    stats: {},
    method: {
      census: 'Census 5: GitHub issues',
      endpoints: [],
      parameters: { network: ctx.config.NETWORK },
      notes: [`Skipped: ${reason}.`],
    },
  });
  return { run: null, findings: 0 };
};

export const githubCommand = async (ctx: ScanContext) => {
  const { config, ports, snapshot, options } = ctx;
  if (config.NETWORK !== 'mainnet') return skipGithub(ctx, GITHUB_NETWORK_SKIP);
  const token = options.env?.GITHUB_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!token) return skipGithub(ctx, 'GITHUB_TOKEN not set');

  await ctx.resetDerived('github_issues');
  const rows: GithubIssueRow[] = [];
  const { value: stats, run } = await measure(ctx, 'github', async () => {
    const scored = await fetchScoredRepos(ports.fetch, config.STELLARLIGHT_URL, REPO_SCORE_FLOOR);
    const openZeppelin = await fetchOrgReposMatching(ports.fetch, token, 'OpenZeppelin', 'stellar');
    const repos = [
      ...new Set([
        ...(scored.ok ? scored.value : []),
        ...(openZeppelin.ok ? openZeppelin.value : []),
      ]),
    ];
    return runGithubCensus({
      client: { fetch: ports.fetch, token, sleep: (ms) => sleep(ms) },
      snapshotTime: snapshot.snapshotTime,
      repos,
      emit: ctx.emit,
      writeDerived: async (name, derived) => {
        rows.push(...(derived as GithubIssueRow[]));
        await ctx.writeDerived(name, derived);
      },
      log: (event) => ctx.log(JSON.stringify(event)),
    });
  });

  await writeExport(options.dataDir, 'github_issues', rows, GITHUB_CSV_COLUMNS);
  await writeCensusRecord(options.dataDir, {
    run,
    summary: summarizeGithub(rows),
    stats,
    method: {
      census: 'Census 5: GitHub issues',
      endpoints: [
        'GET https://api.github.com/search/issues (per_page 100, created in the last 180 days)',
        'GET https://api.github.com/search/repositories?q=org:OpenZeppelin stellar in:name',
        `GET ${config.STELLARLIGHT_URL}/api/repos/search?minScore=${REPO_SCORE_FLOOR}`,
      ],
      parameters: {
        queries: ISSUE_QUERIES.length,
        'lookback (days)': 180,
        'search calls': stats.queries,
        'truncated queries': stats.truncatedQueries.length,
      },
      notes: ISSUE_QUERIES.map((query) => `${query.category}: ${query.terms}`),
    },
  });
  return { run, findings: stats.issues };
};
