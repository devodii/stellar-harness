'use client';

import { QueryClient, QueryClientProvider, type QueryKey } from '@tanstack/react-query';
import * as React from 'react';

export interface QueryStoryProps {
  seed?: [QueryKey, unknown][];
  children: React.ReactNode;
}

export function QueryStory({ seed = [], children }: QueryStoryProps) {
  const [client] = React.useState(() => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } },
    });
    for (const [key, data] of seed) queryClient.setQueryData(key, data);
    return queryClient;
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
