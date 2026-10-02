import type { ContractToolContext } from '../contracts/context';
import { orFail } from '../contracts/context';
import { DEFAULT_LEDGER_CLOSE_SECONDS } from '../contracts/defaults';
import { lookupContract } from '../contracts/lookup';
import { GetContractTtlInput, GetContractTtlOutput } from '../contracts/schemas';
import { classifyTtl } from '../contracts/ttl';
import { defineTool } from '../tool';

export const getContractTtl = defineTool({
  name: 'getContractTtl',
  description:
    'Read the mainnet TTL of a Soroban contract instance and its wasm code: liveUntilLedgerSeq, ledgers and days left, archived and expiring flags, wasm hash, and invocation counts plus source verification status from stellar.expert. Read only.',
  input: GetContractTtlInput,
  output: GetContractTtlOutput,
  run: async ({ contractId }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: true }));
    const ledgerCloseSeconds = ctx.ledgerCloseSeconds ?? DEFAULT_LEDGER_CLOSE_SECONDS;
    const clock = { snapshotLedger: lookup.latestLedger, ledgerCloseSeconds };
    return {
      contractId,
      latestLedger: lookup.latestLedger,
      ledgerCloseSeconds,
      executable: lookup.executable,
      wasmHash: lookup.wasmHash,
      instance: classifyTtl(lookup.instanceEntry, clock),
      code: lookup.codeKey ? classifyTtl(lookup.codeEntry, clock) : null,
      invocations: lookup.expert?.invocations ?? null,
      subinvocations: lookup.expert?.subinvocation ?? null,
      sourceValidation: lookup.expert?.validation?.status ?? null,
    };
  },
});
