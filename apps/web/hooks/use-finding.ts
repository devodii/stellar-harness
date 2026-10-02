'use client';

import { Finding } from '@harness/schema';
import { useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/components/network-provider';
import { fetchJson } from '@/lib/http';

export const useFinding = (findingId: string | null) => {
  const { network } = useNetwork();
  return useQuery({
    queryKey: ['finding', network, findingId] as const,
    queryFn: () => fetchJson(`/api/findings/${findingId}`, Finding),
    enabled: findingId !== null,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
};
