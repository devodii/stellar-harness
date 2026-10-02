import { type ContractToolContext, orFail } from '../contracts/context';
import { DEFAULT_LEDGER_CLOSE_SECONDS, DEFAULT_SIMULATION_SOURCE } from '../contracts/defaults';
import { footprintKeys, lookupContract } from '../contracts/lookup';
import { fetchSimulationSource, simulateFootprint } from '../contracts/rent';
import { SimulateExtendTtlInput, SimulateExtendTtlOutput } from '../contracts/schemas';
import { ledgersForDays } from '../contracts/ttl';
import { defineTool } from '../tool';

export const simulateExtendTtl = defineTool({
  name: 'simulateExtendTtl',
  description:
    'Simulate extending a Soroban contract instance and its wasm code so they stay live for N days (default 365, max 730). Returns the minimum resource fee in stroops, an estimated XLM cost and the unsigned transaction XDR for display. Nothing is signed or submitted.',
  input: SimulateExtendTtlInput,
  output: SimulateExtendTtlOutput,
  run: async ({ contractId, days }, ctx: ContractToolContext) => {
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
});
