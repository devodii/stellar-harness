import {
  CONTRACT_EXPORT_COLUMNS,
  CONTRACT_EXPORT_FILES,
  SCF_EXPORT_COLUMNS,
} from '../../census/contracts/export';
import { runContractsCensus } from '../../census/contracts/index';
import { writeCensusRecord, writeExport } from '../artifacts';
import type { ScanContext } from '../context';
import { measure } from './measure';

const exportName = (file: string) => file.replace(/\.csv$/, '');

export const contractsCommand = async (ctx: ScanContext) => {
  const { config, ports, snapshot, options } = ctx;
  await ctx.resetDerived('contracts', 'contract_rows', 'scf_projects');
  const { value: result, run } = await measure(ctx, 'contracts', () =>
    runContractsCensus(
      {
        fetch: ports.fetch,
        rpc: ports.rpc,
        run: ctx.run,
        emit: ctx.emit,
        writeDerived: ctx.writeDerived,
        checkpoint: ctx.checkpointer('contracts'),
        snapshot,
        stellarExpertUrl: config.STELLAR_EXPERT_URL,
        stellarlightUrl: config.STELLARLIGHT_URL,
        ecosystemDirectory: config.ECOSYSTEM_DIRECTORY,
        rpcConcurrency: config.CONCURRENCY_RPC,
        expertConcurrency: config.CONCURRENCY_EXPERT,
      },
      { limit: options.limit },
    ),
  );

  await writeExport(
    options.dataDir,
    exportName(CONTRACT_EXPORT_FILES.archived),
    result.exports.archived,
    CONTRACT_EXPORT_COLUMNS,
  );
  await writeExport(
    options.dataDir,
    exportName(CONTRACT_EXPORT_FILES.expiring30d),
    result.exports.expiring30d,
    CONTRACT_EXPORT_COLUMNS,
  );
  await writeExport(
    options.dataDir,
    exportName(CONTRACT_EXPORT_FILES.scfFunded),
    result.exports.scfFunded,
    SCF_EXPORT_COLUMNS,
  );

  await writeCensusRecord(options.dataDir, {
    run,
    summary: result.summary,
    stats: {
      ...result.stats,
      gaps: result.gaps.map((gap) => ({ source: gap.source, message: gap.error.message })),
    },
    method: {
      census: 'Census 1: contract state archival',
      endpoints: [
        `GET ${config.STELLAR_EXPERT_URL}/contract?limit=200&order=desc (paged via _links.next)`,
        `GET ${config.STELLAR_EXPERT_URL}/contract/{id} (invocations > 100 only)`,
        `POST ${config.RPC_URL} getLedgerEntries (200 keys per call)`,
        ...(config.ECOSYSTEM_DIRECTORY
          ? [
              `GET ${config.STELLARLIGHT_URL}/api/projects/search?scfAwarded=1`,
              `GET ${config.STELLARLIGHT_URL}/api/repos/search?minScore=0`,
            ]
          : []),
      ],
      parameters: {
        network: config.NETWORK,
        'snapshot ledger': snapshot.snapshotLedger,
        'ledger close seconds': snapshot.ledgerCloseSeconds,
        'expiring window 1 (days)': 30,
        'expiring window 2 (days)': 90,
        'unverified source invocation floor': 100,
        'rpc concurrency': config.CONCURRENCY_RPC,
        'contract limit': options.limit ?? 'none',
      },
      notes: [
        ...result.notes,
        'An instance is archived when RPC does not return it or its liveUntilLedgerSeq is below the snapshot ledger.',
        'Hot-archived entries are returned with liveUntilLedgerSeq 0 and count as archived.',
        `Enumeration complete: ${result.stats.enumerationComplete}.`,
      ],
    },
  });
  return { run, findings: result.stats.findings };
};
