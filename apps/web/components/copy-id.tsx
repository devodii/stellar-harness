'use client';

import { CheckIcon, CopyIcon } from 'lucide-react';
import * as React from 'react';
import { truncateId } from '@/lib/format';

export function CopyId({ id }: { id: string }) {
  const [copied, setCopied] = React.useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      type="button"
      onClick={copy}
      title={id}
      className="inline-flex cursor-pointer items-center gap-1 font-mono text-xs text-muted-foreground hover:text-foreground"
    >
      {truncateId(id)}
      {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
    </button>
  );
}
