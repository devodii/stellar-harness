import type { Result } from '@harness/schema';
import { type NetworkSelection, resolveNetwork } from '../core/network';
import { fail } from '../tool';
import { simulationSourceFor } from './defaults';
import type { Fetcher, HorizonPort, RpcPort } from './ports';
import { fetchSimulationSource } from './rent';

export type ContractToolContext = NetworkSelection & {
  rpc: RpcPort;
  horizon: HorizonPort;
  fetch: Fetcher;
  stellarExpertUrl: string;
  ledgerCloseSeconds?: number;
  simulationSource?: string;
};

export const orFail = <T>(result: Result<T>): T =>
  result.ok ? result.value : fail(result.error.code, result.error.message, result.error.meta);

export const resolveSimulationSource = (ctx: ContractToolContext) => {
  const { network, passphrase } = resolveNetwork(ctx);
  return fetchSimulationSource(
    ctx,
    ctx.simulationSource ?? simulationSourceFor(network),
    passphrase,
  );
};
