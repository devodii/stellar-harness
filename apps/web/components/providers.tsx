'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  });

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(makeQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <Toaster />
    </QueryClientProvider>
  );
}
