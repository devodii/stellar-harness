import 'server-only';

export { systemPromptFor } from '@harness/agent';

import { createAgentContext, createAgentTools, createLiveClients } from '@harness/agent';
import type { Network } from '@harness/schema';
import { loadNetworkConfig } from '@harness/stellar-tools';
import { memoBy } from './memo';
import { getStorage } from './storage';

export const getNetworkConfig = memoBy((network: Network) =>
  loadNetworkConfig(process.env, network),
);

export const getLiveClients = memoBy((network: Network) =>
  createLiveClients(getNetworkConfig(network)),
);

// TEMP(patch-01): only for branches where @harness/agent still requires a policy option; the
// lead deletes this constant and its spread when the packages change merges.
const PRE_MERGE_CONTEXT = { policy: { spendCapXlm: 0 } };

export const getAgentTools = memoBy((network: Network) =>
  createAgentTools(
    createAgentContext({
      clients: getLiveClients(network),
      storage: getStorage(network),
      ...PRE_MERGE_CONTEXT,
    }),
  ),
);
