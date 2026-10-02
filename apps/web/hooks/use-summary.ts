'use client';

import { useQuery } from '@tanstack/react-query';
import { SummaryResponse } from '@/lib/api-schemas';
import { fetchJson } from '@/lib/http';

export const useSummary = () =>
  useQuery({
    queryKey: ['summary'],
    queryFn: () => fetchJson('/api/summary', SummaryResponse),
    staleTime: 60_000,
  });
