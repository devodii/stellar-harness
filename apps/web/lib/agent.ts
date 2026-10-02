import 'server-only';
import {
  createAgentContext,
  createAgentTools,
  createLiveClients,
  systemPrompt,
} from '@harness/agent';
import { DEFAULT_NETWORK } from '@harness/schema';
import { loadNetworkConfig, readPolicy } from '@harness/stellar-tools';
import { memo } from './memo';
import { getStorage } from './storage';

export { systemPrompt };

export const getAgentTools = memo(() =>
  createAgentTools(
    createAgentContext({
      clients: createLiveClients(loadNetworkConfig()),
      storage: getStorage(DEFAULT_NETWORK),
      policy: readPolicy(),
    }),
  ),
);
