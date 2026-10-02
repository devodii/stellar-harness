'use client';

import { useQuery } from '@tanstack/react-query';
import { LiveResponse } from '@/lib/api-schemas';
import { fetchJson } from '@/lib/http';

export const LIVE_POLL_MS = 5_000;

export const useLive = () =>
  useQuery({
    queryKey: ['live'],
    queryFn: () => fetchJson('/api/live', LiveResponse),
    refetchInterval: LIVE_POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: LIVE_POLL_MS,
  });
