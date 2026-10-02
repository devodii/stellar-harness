import { networkSelection } from '@harness/stellar-tools';
import { runSafeAnchorTests } from '../../census/anchors/anchor-tests';
import { makeAnchorProbe, runAnchorCensus } from '../../census/anchors/census';
import { buildDomainList } from '../../census/anchors/domains';
import {
  ANCHORS_FAILING_COLUMNS,
  ANCHORS_FUNNEL_COLUMNS,
  anchorsFailingRows,
  anchorsFunnelRows,
} from '../../census/anchors/export';
import { computeAnchorsSummary } from '../../census/anchors/funnel';
import { KNOWN_ANCHORS } from '../../census/anchors/known';
import { AnchorCensusState } from '../../census/anchors/schemas';
import { writeCensusRecord, writeExport } from '../artifacts';
import type { ScanContext } from '../context';
import { measure } from './measure';

export const ANCHOR_DOMAINS_STATE = 'anchors';

export const anchorsCommand = async (ctx: ScanContext) => {
  const { config, ports, options } = ctx;
  const saved = AnchorCensusState.safeParse(await ctx.readCheckpoint(ANCHOR_DOMAINS_STATE));
  const resume = saved.success ? saved.data : null;
  if (!resume) await ctx.resetDerived('anchor_probe');

  const { value, run } = await measure(ctx, 'anchors', async () => {
    const list = await buildDomainList(ports, {
      stellarlightUrl: config.STELLARLIGHT_URL,
      expertUrl: config.STELLAR_EXPERT_URL,
      limit: options.limit,
      ecosystemDirectory: config.ECOSYSTEM_DIRECTORY,
      knownDomains: KNOWN_ANCHORS[config.NETWORK],
    });
    const probe = makeAnchorProbe(ports, {
      perHost: config.CONCURRENCY_ANCHOR,
      runAnchorTests: (domain, seps) =>
        runSafeAnchorTests(domain, seps, { networkPassphrase: config.NETWORK_PASSPHRASE }),
      ...networkSelection(config),
    });
    const census = await runAnchorCensus(
      list.domains,
      {
        probe,
        run: ctx.run,
        emit: ctx.emit,
        writeDerived: ctx.writeDerived,
        writeJson: ctx.writeDerivedJson,
        checkpoint: ctx.checkpointer(ANCHOR_DOMAINS_STATE),
      },
      { resume, transitive: !options.limit },
    );
    return { list, census };
  });

  const { list, census } = value;
  const rows = census.results.flatMap((result) =>
    result.stages.map((stage) => ({ domain: result.domain, ...stage })),
  );
  const findings = census.results.flatMap((result) => result.findings);
  const tests = census.results.flatMap((result) =>
    result.anchorTests ? [result.anchorTests] : [],
  );
  const summary = computeAnchorsSummary({ domains: census.domains, rows, findings, tests });

  await writeExport(
    options.dataDir,
    'anchors_failing',
    anchorsFailingRows(summary, census.domains, findings),
    ANCHORS_FAILING_COLUMNS,
  );
  await writeExport(
    options.dataDir,
    'anchors_funnel',
    anchorsFunnelRows(summary),
    ANCHORS_FUNNEL_COLUMNS,
  );

  await writeCensusRecord(options.dataDir, {
    run,
    summary,
    stats: {
      domains: census.domains.length,
      sources: list.counts,
      scfSource: list.scfSource,
      unresolvedScfProjects: list.unresolvedScfProjects,
      probeFailures: census.failures,
      skipped: census.skipped,
      gaps: list.gaps,
    },
    method: {
      census: 'Census 3: anchor conformance',
      endpoints: [
        ...(config.ECOSYSTEM_DIRECTORY
          ? [
              `GET ${config.STELLARLIGHT_URL}/api/partners?type=anchor&all=1 and type=on-off-ramp`,
              `GET ${config.STELLARLIGHT_URL}/api/projects/search`,
              'GET https://medium.com/feed/stellar-community (SCF rounds 41 to 45)',
            ]
          : []),
        `GET ${config.STELLAR_EXPERT_URL}/asset?sort=trustlines`,
        'GET https://{domain}/.well-known/stellar.toml',
        `GET ${config.HORIZON_URL}/accounts/{id}`,
        'GET {TRANSFER_SERVER}/info, {TRANSFER_SERVER_SEP0024}/info, {ANCHOR_QUOTE_SERVER}/info, {DIRECT_PAYMENT_SERVER}/info',
        'GET {WEB_AUTH_ENDPOINT}?account=<random public key>',
        '@stellar/anchor-tests 0.6.22, read-only allowlist',
      ],
      parameters: {
        network: config.NETWORK,
        'known anchors': KNOWN_ANCHORS[config.NETWORK].length,
        'toml timeout (s)': 15,
        'max redirects': 3,
        'per-host concurrency': config.CONCURRENCY_ANCHOR,
        'global concurrency': 32,
        'scf source': list.scfSource,
        'domain limit': options.limit ?? 'none',
      },
      notes: [
        ...ctx.notes,
        ...list.notes,
        'The funnel is cumulative: each step counts domains that passed every earlier step.',
        'anchor-tests that write to anchor servers (customer PUT/DELETE, deposit, withdraw, quote POST) and all of SEP-31 are excluded.',
      ],
    },
  });
  return { run, findings: findings.length };
};
