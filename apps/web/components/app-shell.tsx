'use client';

import type * as React from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { LiveHeaderStrip } from '@/components/live-header-strip';
import { NetworkTag } from '@/components/network-tag';
import { TopBar } from '@/components/top-bar';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';

export interface AppShellProps {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
  strip?: React.ReactNode;
}

export function AppShell({ children, sidebar, strip }: AppShellProps) {
  return (
    <SidebarProvider className="h-svh">
      {sidebar ?? <AppSidebar />}
      <SidebarInset className="min-h-0 min-w-0">
        <TopBar strip={strip ?? <LiveHeaderStrip />} badge={<NetworkTag />} />
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
