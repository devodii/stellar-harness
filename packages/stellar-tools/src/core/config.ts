import { defineEnv, type EnvSource, envInt, envUrl } from '@harness/schema';
import { z } from 'zod';

export const networkEnvShape = {
  HORIZON_URL: envUrl('https://horizon.stellar.org'),
  RPC_URL: envUrl('https://mainnet.sorobanrpc.com'),
  STELLAR_EXPERT_URL: envUrl('https://api.stellar.expert/explorer/public'),
  STELLARLIGHT_URL: envUrl('https://stellarlight.xyz'),
  HARNESS_DATA_DIR: z.string().min(1).default('./data'),
  CONCURRENCY_HORIZON: envInt(8),
  CONCURRENCY_RPC: envInt(8),
  CONCURRENCY_EXPERT: envInt(4),
  CONCURRENCY_STELLARLIGHT: envInt(4),
  CONCURRENCY_ANCHOR: envInt(2),
};

export type NetworkConfig = z.infer<z.ZodObject<typeof networkEnvShape>>;

export const loadNetworkConfig = (source?: EnvSource): NetworkConfig =>
  defineEnv(networkEnvShape, source);

export const hostOf = (url: string): string => new URL(url).host;

export const hostLimitsFromConfig = (config: NetworkConfig): Record<string, number> => ({
  [hostOf(config.HORIZON_URL)]: config.CONCURRENCY_HORIZON,
  [hostOf(config.RPC_URL)]: config.CONCURRENCY_RPC,
  [hostOf(config.STELLAR_EXPERT_URL)]: config.CONCURRENCY_EXPERT,
  [hostOf(config.STELLARLIGHT_URL)]: config.CONCURRENCY_STELLARLIGHT,
});
