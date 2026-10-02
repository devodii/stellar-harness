import 'server-only';
import {
  createAgentContext,
  createAgentTools,
  createLiveClients,
  systemPrompt,
} from '@harness/agent';
import { loadNetworkConfig, readPolicy } from '@harness/stellar-tools';
import { memo } from './memo';
import { getStorage } from './storage';

export { systemPrompt };

export const getAgentTools = memo(() =>
  createAgentTools(
    createAgentContext({
      clients: createLiveClients(loadNetworkConfig()),
      storage: getStorage(),
      policy: readPolicy(),
    }),
  ),
);
