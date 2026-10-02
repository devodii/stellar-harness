'use client';

import type { Network } from '@harness/schema';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNetwork } from '@/components/network-provider';
import { FindingsResponse } from '@/lib/api-schemas';
import { fetchJson, toSearchParams } from '@/lib/http';

export interface FindingsFilter {
  type: string[];
  severity: string[];
  tag: string;
}

export const findingsQueryKey = (
  network: Network,
  filter: FindingsFilter,
  pageIndex: number,
  pageSize: number,
) => ['findings', network, filter, pageIndex, pageSize] as const;

export const useFindings = (filter: FindingsFilter, pageIndex: number, pageSize: number) => {
  const { network } = useNetwork();
  return useQuery({
    queryKey: findingsQueryKey(network, filter, pageIndex, pageSize),
    queryFn: () => {
      const params = toSearchParams({
        type: filter.type,
        severity: filter.severity,
        tag: filter.tag.trim() || undefined,
        limit: pageSize,
        offset: pageIndex * pageSize,
      });
      return fetchJson(`/api/findings?${params}`, FindingsResponse);
    },
    placeholderData: keepPreviousData,
  });
};
