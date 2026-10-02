import { type ContractToolContext, orFail } from '../contracts/context';
import { DEFAULT_LEDGER_CLOSE_SECONDS } from '../contracts/defaults';
import { lookupContract } from '../contracts/lookup';
import { GetContractTtlInput, GetContractTtlOutput, type TtlEntry } from '../contracts/schemas';
import { classifyTtl } from '../contracts/ttl';
import { defineTool } from '../tool';

const NO_CODE_ENTRY: TtlEntry = {
  present: false,
  liveUntilLedgerSeq: null,
  ledgersLeft: null,
  daysLeft: null,
  archived: false,
};

export const getContractTtl = defineTool({
  name: 'getContractTtl',
  description:
    'Read the mainnet TTL of a Soroban contract instance and its wasm code: liveUntilLedgerSeq, ledgers and days left, archived flags, wasm hash, and the invocation count from stellar.expert. Read only.',
  input: GetContractTtlInput,
  output: GetContractTtlOutput,
  run: async ({ contractId }, ctx: ContractToolContext) => {
    const lookup = orFail(await lookupContract(ctx, contractId, { withExpert: true }));
    const ledgerCloseSeconds = ctx.ledgerCloseSeconds ?? DEFAULT_LEDGER_CLOSE_SECONDS;
    const clock = { snapshotLedger: lookup.latestLedger, ledgerCloseSeconds };
    return {
      contractId,
      wasmHash: lookup.wasmHash,
      instance: classifyTtl(lookup.instanceEntry, clock),
      code: lookup.codeKey ? classifyTtl(lookup.codeEntry, clock) : NO_CODE_ENTRY,
      invocations: lookup.expert?.invocations ?? null,
      snapshotLedger: lookup.latestLedger,
      ledgerCloseSeconds,
    };
  },
});
