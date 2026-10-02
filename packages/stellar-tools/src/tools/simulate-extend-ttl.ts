import { type ContractToolContext, orFail, resolveSimulationSource } from '../contracts/context';
import { DEFAULT_LEDGER_CLOSE_SECONDS } from '../contracts/defaults';
import { footprintKeys, lookupContract } from '../contracts/lookup';
import { describeFootprintOperation, simulateFootprint } from '../contracts/rent';
import { ledgersForDays } from '../contracts/ttl';
import { defineNamedTool } from './define';

export const simulateExtendTtl = defineNamedTool(
  'simulateExtendTtl',
  async ({ contractId, days }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: false }));
    const source = orFail(await resolveSimulationSource(ctx));
    const extendToLedgers = ledgersForDays(
      days,
      ctx.ledgerCloseSeconds ?? DEFAULT_LEDGER_CLOSE_SECONDS,
    );
    const keys = footprintKeys(lookup);
    const estimate = orFail(
      await simulateFootprint(ctx.rpc, source, keys, { kind: 'extend', extendToLedgers }),
    );
    const operation = describeFootprintOperation(
      { kind: 'extend', days },
      keys.length > 1 ? 'both' : 'instance',
    );
    return { ...estimate, operation, contractId, days, extendToLedgers };
  },
);
