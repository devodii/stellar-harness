import 'server-only';
import {
  createAgentContext,
  createAgentTools,
  createLiveClients,
  systemPrompt,
} from '@harness/agent';
import type { Network } from '@harness/schema';
import { loadNetworkConfig, readPolicy } from '@harness/stellar-tools';
import { memoBy } from './memo';
import { withNetworkContext } from './network-prompt';
import { getStorage } from './storage';

export const getNetworkConfig = memoBy((network: Network) =>
  loadNetworkConfig(process.env, network),
);

export const getLiveClients = memoBy((network: Network) =>
  createLiveClients(getNetworkConfig(network)),
);

export const getAgentTools = memoBy((network: Network) =>
  createAgentTools(
    createAgentContext({
      clients: getLiveClients(network),
      storage: getStorage(network),
      policy: readPolicy(),
    }),
  ),
);

export const systemPromptFor = (network: Network): string =>
  withNetworkContext(systemPrompt, network);
