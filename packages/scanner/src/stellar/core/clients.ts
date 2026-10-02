import type { Cache } from './cache';
import { hostLimitsFromConfig, hostOf, type NetworkConfig } from './config';
import { createHorizonClient, type HorizonClient } from './horizon';
import { createHttp, type Http, type HttpOptions } from './http';
import type { HttpLogger } from './log';
import { createRpcClient, type RpcClient } from './rpc';
import { HostLimiter } from './semaphore';

export const DEFAULT_GLOBAL_CONCURRENCY = 32;

export type NetworkClients = {
  config: NetworkConfig;
  http: Http;
  rpc: RpcClient;
  horizon: HorizonClient;
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
  };
};
