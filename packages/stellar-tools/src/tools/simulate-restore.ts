import { type ContractToolContext, orFail, resolveSimulationSource } from '../contracts/context';
import { type ContractLookup, footprintKeys, lookupContract } from '../contracts/lookup';
import { describeFootprintOperation, simulateFootprint } from '../contracts/rent';
import type { RestoreEntries } from '../contracts/schemas';
import { fail } from '../tool';
import { defineNamedTool } from './define';

const restoreKeys = (lookup: ContractLookup, entries: RestoreEntries) => {
  if (entries === 'both') return footprintKeys(lookup);
  if (entries === 'instance') return [lookup.instanceKey];
  return lookup.codeKey
    ? [lookup.codeKey]
    : fail('INVALID_INPUT', `Contract ${lookup.contractId} has no wasm code entry to restore`);
};

export const simulateRestore = defineNamedTool(
  'simulateRestore',
  async ({ contractId, entries }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: false }));
    const source = orFail(await resolveSimulationSource(ctx));
    const estimate = orFail(
      await simulateFootprint(ctx.rpc, source, restoreKeys(lookup, entries), { kind: 'restore' }),
    );
    const operation = describeFootprintOperation({ kind: 'restore' }, entries);
    return { ...estimate, operation, contractId, entries };
  },
);
