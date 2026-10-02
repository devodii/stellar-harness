import type * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface HintProps {
  hint: React.ReactNode;
  children: React.ReactElement;
  side?: React.ComponentProps<typeof TooltipContent>['side'];
}

export function Hint({ hint, children, side }: HintProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {hint}
      </TooltipContent>
    </Tooltip>
  );
}
