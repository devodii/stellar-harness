import { type ContractToolContext, orFail } from '../contracts/context';
import { DEFAULT_LEDGER_CLOSE_SECONDS, DEFAULT_SIMULATION_SOURCE } from '../contracts/defaults';
import { footprintKeys, lookupContract } from '../contracts/lookup';
import { fetchSimulationSource, simulateFootprint } from '../contracts/rent';
import { ledgersForDays } from '../contracts/ttl';
import { defineNamedTool } from './define';

export const simulateExtendTtl = defineNamedTool(
  'simulateExtendTtl',
  async ({ contractId, days }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: false }));
    const source = orFail(
      await fetchSimulationSource(ctx.horizon, ctx.simulationSource ?? DEFAULT_SIMULATION_SOURCE),
    );
    const extendToLedgers = ledgersForDays(
      days,
      ctx.ledgerCloseSeconds ?? DEFAULT_LEDGER_CLOSE_SECONDS,
    );
    const estimate = orFail(
      await simulateFootprint(ctx.rpc, source, footprintKeys(lookup), {
        kind: 'extend',
        extendToLedgers,
      }),
    );
    return { ...estimate, contractId, days, extendToLedgers };
  },
);
