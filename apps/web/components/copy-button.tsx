'use client';

import { CheckIcon, CopyIcon } from '@phosphor-icons/react/ssr';
import { cn } from 'cn';
import type * as React from 'react';
import { Button } from '@/components/ui/button';
import { useCopy } from '@/hooks/use-copy';

export interface CopyButtonProps
  extends Omit<React.ComponentProps<typeof Button>, 'onClick' | 'children'> {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = 'Copy', className, ...props }: CopyButtonProps) {
  const { copied, copy } = useCopy();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={copied ? 'Copied' : label}
      className={cn('size-6 text-muted-foreground hover:text-foreground', className)}
      onClick={(event) => {
        event.stopPropagation();
        void copy(value);
      }}
      {...props}
    >
      {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
    </Button>
  );
}
