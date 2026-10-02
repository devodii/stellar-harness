'use client';

import { cn } from 'cn';
import * as React from 'react';
import { CodeBlock, CodeBlockCopyButton } from '@/components/ai-elements/code-block';

const stringify = (value: unknown): string => {
  try {
    return (
      JSON.stringify(value, (_key, v) => (typeof v === 'bigint' ? v.toString() : v), 2) ??
      'undefined'
    );
  } catch {
    return String(value);
  }
};

export interface JsonViewProps {
  value: unknown;
  maxHeight?: number;
  copyable?: boolean;
  showLineNumbers?: boolean;
  className?: string;
}

export function JsonView({
  value,
  maxHeight = 360,
  copyable = true,
  showLineNumbers = false,
  className,
}: JsonViewProps) {
  const json = React.useMemo(() => stringify(value), [value]);

  return (
    <CodeBlock
      code={json}
      language="json"
      showLineNumbers={showLineNumbers}
      translate="no"
      style={{ maxHeight }}
      className={cn('notranslate relative overflow-auto text-xs', className)}
    >
      {copyable && (
        <CodeBlockCopyButton
          aria-label="Copy JSON"
          className="absolute top-1.5 right-1.5 z-10 size-7"
        />
      )}
    </CodeBlock>
  );
}
