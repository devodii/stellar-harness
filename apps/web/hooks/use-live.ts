'use client';

import type { Network } from '@harness/schema';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/components/network-provider';
import { LiveResponse } from '@/lib/api-schemas';
import { fetchJson } from '@/lib/http';

export const LIVE_POLL_MS = 5_000;

export const liveQueryKey = (network: Network) => ['live', network] as const;

export const useLive = () => {
  const { network } = useNetwork();
  return useQuery({
    queryKey: liveQueryKey(network),
    queryFn: () => fetchJson('/api/live', LiveResponse),
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_POLL_MS,
  });
};
