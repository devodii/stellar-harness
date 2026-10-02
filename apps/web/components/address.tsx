'use client';

import { cn } from 'cn';
import { CopyButton } from '@/components/copy-button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { truncateMiddle } from '@/lib/format';

export interface AddressProps {
  value: string;
  head?: number;
  tail?: number;
  href?: string;
  copyable?: boolean;
  className?: string;
}

export function Address({
  value,
  head = 4,
  tail = 4,
  href,
  copyable = true,
  className,
}: AddressProps) {
  const short = truncateMiddle(value, head, tail);
  const text = (
    <span translate="no" className="notranslate font-mono text-xs tabular-nums">
      {short}
    </span>
  );

  return (
    <span className={cn('inline-flex items-center gap-0.5 align-middle', className)}>
      <Tooltip>
        <TooltipTrigger asChild>
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline-offset-2 hover:underline"
              onClick={(event) => event.stopPropagation()}
            >
              {text}
            </a>
          ) : (
            <span className="cursor-default">{text}</span>
          )}
        </TooltipTrigger>
        <TooltipContent className="max-w-none font-mono text-xs break-all">{value}</TooltipContent>
      </Tooltip>
      {copyable && <CopyButton value={value} label={`Copy ${short}`} />}
    </span>
  );
}
