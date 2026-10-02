'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { FindingsResponse } from '@/lib/api-schemas';
import { fetchJson, toSearchParams } from '@/lib/http';

export interface FindingsFilter {
  type: string[];
  severity: string[];
  tag: string;
}

export const useFindings = (filter: FindingsFilter, pageIndex: number, pageSize: number) =>
  useQuery({
    queryKey: ['findings', filter, pageIndex, pageSize],
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
