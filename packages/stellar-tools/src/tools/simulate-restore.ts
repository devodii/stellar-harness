import { type ContractToolContext, orFail } from '../contracts/context';
import { DEFAULT_SIMULATION_SOURCE } from '../contracts/defaults';
import { type ContractLookup, footprintKeys, lookupContract } from '../contracts/lookup';
import { fetchSimulationSource, simulateFootprint } from '../contracts/rent';
import {
  type RestoreEntries,
  SimulateRestoreInput,
  SimulateRestoreOutput,
} from '../contracts/schemas';
import { defineTool, fail } from '../tool';

const restoreKeys = (lookup: ContractLookup, entries: RestoreEntries) => {
  if (entries === 'both') return footprintKeys(lookup);
  if (entries === 'instance') return [lookup.instanceKey];
  return lookup.codeKey
    ? [lookup.codeKey]
    : fail('INVALID_INPUT', `Contract ${lookup.contractId} has no wasm code entry to restore`);
};

export const simulateRestore = defineTool({
  name: 'simulateRestore',
  description:
    'Simulate restoring an archived Soroban contract instance, its wasm code, or both (RestoreFootprint). Returns the minimum resource fee in stroops, an estimated XLM cost and the unsigned transaction XDR for display. Nothing is signed or submitted.',
  input: SimulateRestoreInput,
  output: SimulateRestoreOutput,
  run: async ({ contractId, entries }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: false }));
    const source = orFail(
      await fetchSimulationSource(ctx.horizon, ctx.simulationSource ?? DEFAULT_SIMULATION_SOURCE),
    );
    const estimate = orFail(
      await simulateFootprint(ctx.rpc, source, restoreKeys(lookup, entries), { kind: 'restore' }),
    );
    return { ...estimate, contractId, entries };
  },
});
