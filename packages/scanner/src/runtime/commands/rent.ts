import { RENT_DERIVED, RENT_TOP_COLUMNS, runRentCensus } from '../../census/rent';
import { simulationSourceFor } from '../../stellar/contracts';
import { writeCensusRecord, writeExport } from '../artifacts';
import type { ScanContext } from '../context';
import { readContractRows } from './contract-rows';
import { measure } from './measure';

export const rentCommand = async (ctx: ScanContext) => {
  const { config, ports, snapshot } = ctx;
  const contracts = await readContractRows(ctx);
  if (contracts.length === 0) {
    ctx.log('[rent] no contract rows found; run the contracts census first');
    return { run: null, findings: 0 };
  }
  await ctx.resetDerived(RENT_DERIVED);
  const { value: result, run } = await measure(ctx, 'rent', () =>
    runRentCensus(
      {
        rpc: ports.rpc,
        horizon: ports.horizon,
        fetch: ports.fetch,
        run: ctx.run,
        emit: ctx.emit,
        writeDerived: ctx.writeDerived,
        snapshot,
        rpcConcurrency: config.CONCURRENCY_RPC,
      },
      contracts,
    ),
  );

  await writeExport(ctx.persistence, 'rent_top100', result.top, RENT_TOP_COLUMNS);
  await writeCensusRecord(ctx.persistence, {
    run,
    summary: result.summary,
    stats: {
      ...result.stats,
      method: result.method,
      gaps: result.gaps.map((gap) => ({ source: gap.source, message: gap.error.message })),
    },
    method: {
      census: 'Census 4: rent',
      endpoints: [
        `POST ${config.RPC_URL} simulateTransaction (extendFootprintTtl, read-only footprint of instance and code)`,
        `GET ${config.HORIZON_URL}/accounts/{simulation source} (RPC getLedgerEntries when Horizon fails)`,
        'GET https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=usd',
      ],
      parameters: {
        network: config.NETWORK,
        'simulation source': simulationSourceFor(config.NETWORK),
        'extend horizon (days)': 365,
        'full population limit': 5000,
        'sample size above the limit': 2000,
        'sample strata': 10,
        'sample seed': 20261002,
        'live instances': result.stats.liveInstances,
        simulated: result.stats.simulated,
      },
      notes: [
        ...ctx.notes,
        'Rent is the minimum resource fee returned by simulation; nothing is signed or submitted.',
        'Totals sum simulated contracts only, with no population weighting.',
      ],
    },
  });
  return { run, findings: result.rows.length };
};
