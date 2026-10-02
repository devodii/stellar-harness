'use client';

import { BuildingsIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import * as React from 'react';
import { CONNECT_TITLE, ConnectForm } from '@/components/connect-form';
import { ResponsiveSheet } from '@/components/responsive-sheet';
import { Button } from '@/components/ui/button';
import { requestPilot as postPilotRequest, type RequestPilot } from '@/lib/waitlist';

export interface ConnectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestPilot?: RequestPilot;
}

export function ConnectSheet({
  open,
  onOpenChange,
  requestPilot = postPilotRequest,
}: ConnectSheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={onOpenChange} title={CONNECT_TITLE}>
      <ConnectForm requestPilot={requestPilot} />
    </ResponsiveSheet>
  );
}

const ConnectSheetContext = React.createContext<(() => void) | null>(null);

export const useOpenConnectSheet = (): (() => void) | null => React.useContext(ConnectSheetContext);

export function ConnectSheetProvider({
  children,
  requestPilot,
}: {
  children: React.ReactNode;
  requestPilot?: RequestPilot;
}) {
  const [open, setOpen] = React.useState(false);
  const openSheet = React.useCallback(() => setOpen(true), []);
  return (
    <ConnectSheetContext.Provider value={openSheet}>
      {children}
      <ConnectSheet open={open} onOpenChange={setOpen} requestPilot={requestPilot} />
    </ConnectSheetContext.Provider>
  );
}

export interface ConnectButtonProps {
  variant?: 'bar' | 'inline';
  className?: string;
}

export function ConnectButton({ variant = 'bar', className }: ConnectButtonProps) {
  const openSheet = useOpenConnectSheet();
  if (!openSheet) return null;
  const inline = variant === 'inline';
  return (
    <Button
      type="button"
      variant={inline ? 'link' : 'outline'}
      size={inline ? 'xs' : 'sm'}
      onClick={openSheet}
      aria-label="connect organisation"
      className={cn('font-mono text-xs', inline && 'h-auto px-0', className)}
    >
      {!inline && <BuildingsIcon aria-hidden />}
      <span className={cn(!inline && 'hidden sm:inline')}>connect organisation</span>
    </Button>
  );
}
