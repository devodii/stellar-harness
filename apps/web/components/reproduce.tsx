export function Reproduce({ lines }: { lines: string[] }) {
  return (
    <pre className="overflow-x-auto rounded-md border px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">
      {lines.join('\n')}
    </pre>
  );
}
