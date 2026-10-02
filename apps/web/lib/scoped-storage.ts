import type { Network } from '@harness/schema';
import type { Storage } from '@harness/storage';

export const scopeStorageToNetwork = (storage: Storage, network: Network): Storage => {
  const belongs = async () => {
    const snapshot = await storage.getSnapshot();
    return !snapshot || snapshot.network === network;
  };
  return {
    putFindings: (findings) => storage.putFindings(findings),
    putSummary: (summary) => storage.putSummary(summary),
    queryFindings: async (query) =>
      (await belongs()) ? storage.queryFindings(query) : { rows: [], total: 0 },
    getFinding: async (findingId) => ((await belongs()) ? storage.getFinding(findingId) : null),
    getSummary: async () => ((await belongs()) ? storage.getSummary() : null),
    getSnapshot: async () => ((await belongs()) ? storage.getSnapshot() : null),
  };
};
