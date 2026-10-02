import { cn } from 'cn';
import * as React from 'react';
import { CopyButton } from '@/components/copy-button';

const TOKEN =
  /("(?:\\u[a-fA-F0-9]{4}|\\[^u]|[^\\"])*"(?:\s*:)?|\btrue\b|\bfalse\b|\bnull\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;

const tokenClass = (token: string): string => {
  if (token.startsWith('"'))
    return token.trimEnd().endsWith(':') ? 'text-foreground' : 'text-success';
  if (token === 'null') return 'text-muted-foreground';
  if (token === 'true' || token === 'false') return 'text-warning';
  return 'text-primary';
};

const highlight = (json: string): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  for (const match of json.matchAll(TOKEN)) {
    const index = match.index ?? 0;
    if (index > last) nodes.push(json.slice(last, index));
    nodes.push(
      <span key={index} className={tokenClass(match[0])}>
        {match[0]}
      </span>,
    );
    last = index + match[0].length;
  }
  if (last < json.length) nodes.push(json.slice(last));
  return nodes;
};

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
  className?: string;
}

export function JsonView({ value, maxHeight = 360, copyable = true, className }: JsonViewProps) {
  const json = React.useMemo(() => stringify(value), [value]);
  const nodes = React.useMemo(() => highlight(json), [json]);

  return (
    <div className={cn('relative rounded-md border border-border bg-muted/40', className)}>
      {copyable && (
        <CopyButton value={json} label="Copy JSON" className="absolute top-1.5 right-1.5" />
      )}
      <pre
        translate="no"
        style={{ maxHeight }}
        className="notranslate overflow-auto p-3 pr-9 font-mono text-xs leading-relaxed text-muted-foreground"
      >
        <code>{nodes}</code>
      </pre>
    </div>
  );
}
