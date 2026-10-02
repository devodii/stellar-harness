import { z } from 'zod';
import {
  DEFAULT_NETWORK,
  defineEnv,
  type EnvSource,
  envInt,
  envUrl,
  NETWORK_PROFILES,
  type Network,
} from '../../schema';

const urlOverrides = (network: Network) => {
  const profile = NETWORK_PROFILES[network];
  const prefix = network === 'mainnet' ? '' : `${network.toUpperCase()}_`;
  return {
    keys: {
      HORIZON_URL: `${prefix}HORIZON_URL`,
      RPC_URL: `${prefix}RPC_URL`,
      STELLAR_EXPERT_URL: `${prefix}STELLAR_EXPERT_URL`,
    },
    defaults: {
      HORIZON_URL: profile.horizonUrl,
      RPC_URL: profile.rpcUrl,
      STELLAR_EXPERT_URL: profile.stellarExpertUrl,
    },
  };
};

export const networkEnvShape = {
  HORIZON_URL: envUrl(NETWORK_PROFILES.mainnet.horizonUrl),
  RPC_URL: envUrl(NETWORK_PROFILES.mainnet.rpcUrl),
  STELLAR_EXPERT_URL: envUrl(NETWORK_PROFILES.mainnet.stellarExpertUrl),
  STELLARLIGHT_URL: envUrl('https://stellarlight.xyz'),
  HARNESS_DATA_DIR: z.string().min(1).default('./data'),
  CONCURRENCY_HORIZON: envInt(8),
  CONCURRENCY_RPC: envInt(8),
  CONCURRENCY_EXPERT: envInt(4),
  CONCURRENCY_STELLARLIGHT: envInt(4),
  CONCURRENCY_ANCHOR: envInt(2),
};

export type NetworkConfig = z.infer<z.ZodObject<typeof networkEnvShape>> & {
  NETWORK: Network;
  NETWORK_PASSPHRASE: string;
  ECOSYSTEM_DIRECTORY: boolean;
};

export const loadNetworkConfig = (
  source: EnvSource = process.env,
  network: Network = DEFAULT_NETWORK,
): NetworkConfig => {
  const { keys, defaults } = urlOverrides(network);
  const resolved: EnvSource = { ...source };
  for (const [key, sourceKey] of Object.entries(keys) as [keyof typeof keys, string][]) {
    resolved[key] = source[sourceKey] ?? defaults[key];
  }
  const profile = NETWORK_PROFILES[network];
  return {
    ...defineEnv(networkEnvShape, resolved),
    NETWORK: network,
    NETWORK_PASSPHRASE: profile.passphrase,
    ECOSYSTEM_DIRECTORY: profile.ecosystemDirectory,
  };
};

export const hostOf = (url: string): string => new URL(url).host;

export const hostLimitsFromConfig = (config: NetworkConfig): Record<string, number> => ({
  [hostOf(config.HORIZON_URL)]: config.CONCURRENCY_HORIZON,
  [hostOf(config.RPC_URL)]: config.CONCURRENCY_RPC,
  [hostOf(config.STELLAR_EXPERT_URL)]: config.CONCURRENCY_EXPERT,
  [hostOf(config.STELLARLIGHT_URL)]: config.CONCURRENCY_STELLARLIGHT,
});
