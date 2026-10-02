import type { HarnessMessage } from '@harness/agent';
import type {
  AccountView,
  AnchorProbe,
  ContractTtl,
  EntryTtl,
  Preflight,
} from '@harness/stellar-tools';
import { getToolName } from 'ai';
import type * as React from 'react';
import { ActionCard } from '@/components/action-card';
import { Tool, ToolContent, ToolHeader, type ToolStatus } from '@/components/ai-elements/tool';
import { formatXlm, truncateId } from '@/lib/format';

type Part = HarnessMessage['parts'][number];
type ToolPart = Extract<Part, { type: `tool-${string}` }>;

const isToolPart = (part: Part): part is ToolPart => part.type.startsWith('tool-');

const Box = ({ children }: { children: React.ReactNode }) => (
  <div className="space-y-1 rounded-md border p-3 font-mono text-xs">{children}</div>
);

const Line = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <p className="flex justify-between gap-4">
    <span className="text-muted-foreground">{label}</span>
    <span className="truncate">{value}</span>
  </p>
);

function AccountResult({ account }: { account: AccountView }) {
  if (!account.exists) return <Box>{truncateId(account.address)} does not exist</Box>;
  return (
    <Box>
      <Line label="balance" value={formatXlm(account.xlm ?? 0)} />
      <Line label="sequence" value={account.sequence} />
      <Line label="signers" value={account.signers} />
      {account.trustlines.length === 0 ? (
        <Line label="trustlines" value="none" />
      ) : (
        account.trustlines.map((line) => (
          <Line
            key={line.asset}
            label={line.asset.split(':')[0] ?? line.asset}
            value={`${Number(line.balance).toLocaleString('en-US')} of ${truncateId(line.asset.split(':')[1] ?? '')}`}
          />
        ))
      )}
    </Box>
  );
}

const entryLabel = (entry: EntryTtl | null): string =>
  !entry ? 'unknown' : entry.archived ? 'archived' : `${entry.daysLeft} days left`;

function ContractTtlResult({ ttl }: { ttl: ContractTtl }) {
  return (
    <Box>
      <Line label="instance" value={entryLabel(ttl.instance)} />
      <Line label="code" value={entryLabel(ttl.code)} />
      <Line label="wasm" value={ttl.wasmHash ? truncateId(ttl.wasmHash, 6) : 'unknown'} />
    </Box>
  );
}

function PreflightResult({ preflight }: { preflight: Preflight }) {
  if (preflight.ok) return <Box>ok</Box>;
  return (
    <Box>
      {preflight.blockers.map((blocker) => (
        <p key={blocker.code}>
          {blocker.code} · {blocker.plain} · {blocker.fix}
        </p>
      ))}
    </Box>
  );
}

function AnchorProbeResult({ probe }: { probe: AnchorProbe }) {
  return (
    <Box>
      {probe.stages.map((stage) => (
        <Line
          key={stage.name}
          label={stage.name}
          value={stage.detail ? `${stage.status} · ${stage.detail}` : stage.status}
        />
      ))}
    </Box>
  );
}

function ToolOutput({ part }: { part: ToolPart }) {
  if (part.state !== 'output-available') return null;
  switch (part.type) {
    case 'tool-getAccount':
      return <AccountResult account={part.output} />;
    case 'tool-getContractTtl':
      return <ContractTtlResult ttl={part.output} />;
    case 'tool-buildPaymentPreflight':
      return <PreflightResult preflight={part.output} />;
    case 'tool-probeAnchor':
      return <AnchorProbeResult probe={part.output} />;
    default:
      return null;
  }
}

const argsSummary = (input: unknown): string =>
  Object.values(input && typeof input === 'object' ? input : {})
    .map((value) =>
      typeof value === 'string' && value.length > 20 ? truncateId(value) : String(value),
    )
    .join(', ');

const statusOf = (part: ToolPart): ToolStatus =>
  part.state === 'output-error' ? 'error' : part.state === 'output-available' ? 'done' : 'running';

export function ToolCall({ part }: { part: Part }) {
  if (!isToolPart(part)) return null;
  if (part.type === 'tool-proposeAction' && part.state === 'output-available') {
    return <ActionCard action={part.output} />;
  }
  const output = <ToolOutput part={part} />;
  return (
    <Tool open>
      <ToolHeader
        title={`${getToolName(part)}(${argsSummary(part.input)})`}
        status={statusOf(part)}
      />
      {part.state === 'output-error' && (
        <ToolContent className="font-mono text-xs">{part.errorText}</ToolContent>
      )}
      {part.state === 'output-available' && <ToolContent>{output}</ToolContent>}
    </Tool>
  );
}
