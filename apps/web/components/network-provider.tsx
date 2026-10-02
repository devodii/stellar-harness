'use client';

import { DEFAULT_NETWORK, NETWORK_PROFILES, type Network } from '@harness/schema';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { toast } from 'sonner';
import { NetworkBody } from '@/lib/api-schemas';
import { fetchJson } from '@/lib/http';

export interface NetworkContextValue {
  network: Network;
  pending: boolean;
  setNetwork: (network: Network) => Promise<void>;
}

const NetworkContext = React.createContext<NetworkContextValue>({
  network: DEFAULT_NETWORK,
  pending: false,
  setNetwork: async () => {},
});

export const useNetwork = (): NetworkContextValue => React.useContext(NetworkContext);

export const persistNetwork = async (network: Network): Promise<void> => {
  await fetchJson('/api/network', NetworkBody, {
    method: 'POST',
    headers: { accept: 'application/json', 'content-type': 'application/json' },
    body: JSON.stringify({ network }),
  });
};

export interface NetworkProviderProps {
  initialNetwork: Network;
  persist?: (network: Network) => Promise<void>;
  children: React.ReactNode;
}

export function NetworkProvider({
  initialNetwork,
  persist = persistNetwork,
  children,
}: NetworkProviderProps) {
  const router = useRouter();
  const [network, setLocalNetwork] = React.useState(initialNetwork);
  const [saving, setSaving] = React.useState(false);
  const [refreshing, startRefresh] = React.useTransition();

  React.useEffect(() => setLocalNetwork(initialNetwork), [initialNetwork]);

  const setNetwork = React.useCallback(
    async (next: Network) => {
      if (next === network) return;
      setSaving(true);
      try {
        await persist(next);
        setLocalNetwork(next);
        startRefresh(() => router.refresh());
      } catch (error) {
        toast.error(`Could not switch to ${NETWORK_PROFILES[next].label}`, {
          description: error instanceof Error ? error.message : undefined,
        });
      } finally {
        setSaving(false);
      }
    },
    [network, persist, router],
  );

  const value = React.useMemo(
    () => ({ network, pending: saving || refreshing, setNetwork }),
    [network, saving, refreshing, setNetwork],
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}
