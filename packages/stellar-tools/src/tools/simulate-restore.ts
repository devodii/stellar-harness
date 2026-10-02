import { type ContractToolContext, orFail } from '../contracts/context';
import { DEFAULT_SIMULATION_SOURCE } from '../contracts/defaults';
import { footprintKeys, lookupContract } from '../contracts/lookup';
import { fetchSimulationSource, simulateFootprint } from '../contracts/rent';
import { SimulateRestoreInput, SimulateRestoreOutput } from '../contracts/schemas';
import { defineTool } from '../tool';

export const simulateRestore = defineTool({
  name: 'simulateRestore',
  description:
    'Simulate restoring an archived Soroban contract instance and its wasm code (RestoreFootprint). Returns the minimum resource fee in stroops, an estimated XLM cost and the unsigned transaction XDR for display. Nothing is signed or submitted.',
  input: SimulateRestoreInput,
  output: SimulateRestoreOutput,
  run: async ({ contractId, sourceAccount }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: false }));
    const accountId = sourceAccount ?? ctx.simulationSource ?? DEFAULT_SIMULATION_SOURCE;
    const source = orFail(await fetchSimulationSource(ctx.horizon, accountId));
    const estimate = orFail(
      await simulateFootprint(ctx.rpc, source, footprintKeys(lookup), { kind: 'restore' }),
    );
    return { ...estimate, contractId, sourceAccount: accountId, wasmHash: lookup.wasmHash };
  },
});
