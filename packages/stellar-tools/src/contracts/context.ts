import type { Result } from '@harness/schema';
import { fail } from '../tool';
import type { Fetcher, HorizonPort, RpcPort } from './ports';

export type ContractToolContext = {
  rpc: RpcPort;
  horizon: HorizonPort;
  fetch: Fetcher;
  stellarExpertUrl: string;
  ledgerCloseSeconds?: number;
  simulationSource?: string;
};

export const orFail = <T>(result: Result<T>): T =>
  result.ok ? result.value : fail(result.error.code, result.error.message, result.error.meta);
