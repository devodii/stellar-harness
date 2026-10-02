'use client';

import { CheckCircleIcon, InfoIcon, WarningIcon, XIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import * as React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TONE_TEXT } from '@/lib/tone';

type InlineAlertTone = 'neutral' | 'success' | 'warning' | 'destructive';

const TONE_ICON: Record<InlineAlertTone, React.ComponentType<{ className?: string }>> = {
  neutral: InfoIcon,
  success: CheckCircleIcon,
  warning: WarningIcon,
  destructive: WarningIcon,
};

const TONE_CLASS: Record<InlineAlertTone, string> = {
  neutral: '',
  success: 'border-success/40 text-success [&>svg]:text-success',
  warning: 'border-warning/40 text-warning [&>svg]:text-warning',
  destructive: `border-destructive/40 ${TONE_TEXT.destructive} [&>svg]:text-current`,
};

export interface InlineAlertProps {
  tone?: InlineAlertTone;
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  className?: string;
  resetKey?: string | number;
}

export function InlineAlert({
  tone = 'neutral',
  title,
  children,
  dismissible = false,
  className,
  resetKey,
}: InlineAlertProps) {
  const [dismissed, setDismissed] = React.useState<string | number | undefined | null>(null);
  if (dismissed !== null && dismissed === resetKey) return null;

  const Icon = TONE_ICON[tone];
  return (
    <Alert className={cn(TONE_CLASS[tone], dismissible && 'pr-9', className)}>
      <Icon className="size-4" />
      {title && <AlertTitle>{title}</AlertTitle>}
      <AlertDescription className="text-current/90">{children}</AlertDescription>
      {dismissible && (
        <button
          type="button"
          onClick={() => setDismissed(resetKey)}
          aria-label="Dismiss"
          className="absolute top-3 right-3 cursor-pointer text-current opacity-60 transition-opacity hover:opacity-100"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </Alert>
  );
}
