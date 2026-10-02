'use client';

import type { Network } from '@harness/schema';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/components/network-provider';
import { SummaryResponse } from '@/lib/api-schemas';
import { fetchJson } from '@/lib/http';

export const summaryQueryKey = (network: Network) => ['summary', network] as const;

export const useSummary = () => {
  const { network } = useNetwork();
  return useQuery({
    queryKey: summaryQueryKey(network),
    queryFn: () => fetchJson('/api/summary', SummaryResponse),
    staleTime: 60_000,
  });
};
