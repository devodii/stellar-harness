import type { Cache } from './cache';
import { hostLimitsFromConfig, hostOf, type NetworkConfig } from './config';
import { createExpertClient, type ExpertClient } from './expert';
import { createHorizonClient, type HorizonClient } from './horizon';
import { createHttp, type Http, type HttpOptions } from './http';
import type { HttpLogger } from './log';
import { createRpcClient, type RpcClient } from './rpc';
import { HostLimiter } from './semaphore';
import { createStellarlightClient, type StellarlightClient } from './stellarlight';

export const DEFAULT_GLOBAL_CONCURRENCY = 32;

export type NetworkClients = {
  config: NetworkConfig;
  http: Http;
  rpc: RpcClient;
  horizon: HorizonClient;
  expert: ExpertClient;
  stellarlight: StellarlightClient;
};

export type ClientOptions = Omit<HttpOptions, 'limiter' | 'cache' | 'log'> & {
  cache?: Cache;
  log?: HttpLogger;
  limits?: Record<string, number>;
  globalLimit?: number;
};

export const createClients = (
  config: NetworkConfig,
  { cache, log, limits, globalLimit = DEFAULT_GLOBAL_CONCURRENCY, ...http }: ClientOptions = {},
): NetworkClients => {
  const limiter = new HostLimiter({
    limits: { ...hostLimitsFromConfig(config), ...limits },
    defaultLimit: config.CONCURRENCY_ANCHOR,
    globalLimit,
  });
  const reliableHosts = new Set(
    [config.HORIZON_URL, config.RPC_URL, config.STELLAR_EXPERT_URL, config.STELLARLIGHT_URL].map(
      hostOf,
    ),
  );
  const client = createHttp({ reliableHosts, ...http, limiter, cache, log });
  return {
    config,
    http: client,
    rpc: createRpcClient({ http: client, url: config.RPC_URL }),
    horizon: createHorizonClient({ http: client, url: config.HORIZON_URL }),
    expert: createExpertClient({ http: client, url: config.STELLAR_EXPERT_URL }),
    stellarlight: createStellarlightClient({ http: client, url: config.STELLARLIGHT_URL }),
  };
};
