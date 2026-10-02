'use client';

import { LiveStrip, type LiveStripItem } from '@/components/live-strip';
import { useLive } from '@/hooks/use-live';
import type { LiveResponse } from '@/lib/api-schemas';
import { formatDateTime, formatInt, formatPercent, formatSeconds } from '@/lib/format';

const ledgerTitle = (live: LiveResponse | undefined): string | undefined => {
  if (!live?.ledgerSource) return undefined;
  const closed = live.closedAt ? `closed ${formatDateTime(live.closedAt)} UTC, ` : '';
  return `${closed}via ${live.ledgerSource}`;
};

const archivedTitle = (live: LiveResponse | undefined): string | undefined =>
  live?.archivedContracts == null
    ? undefined
    : `${formatInt(live.archivedContracts)} archived in total (active: 100+ invocations or SCF-funded)`;

export const liveStripItems = (live: LiveResponse | undefined): LiveStripItem[] => [
  {
    id: 'ledger',
    label: 'ledger',
    value: live?.latestLedger,
    title: ledgerTitle(live),
  },
  { id: 'close', label: 'close', value: live?.ledgerCloseSeconds, format: formatSeconds },
  {
    id: 'failed',
    label: live?.window.days ? `failed ${live.window.days}d` : 'failed',
    value: live?.window.txFailed,
    tone: 'destructive',
  },
  {
    id: 'preventable',
    label: 'preventable',
    value: live?.window.preventableShare,
    format: (share) => formatPercent(share),
    tone: 'warning',
  },
  {
    id: 'archived',
    label: 'archived',
    qualifier: 'active',
    value: live?.archivedMeaningful,
    title: archivedTitle(live),
  },
  { id: 'anchors', label: 'anchors failing', value: live?.anchorsFailing },
];

export function LiveHeaderStrip({ className }: { className?: string }) {
  const { data, isPending, isError } = useLive();
  return (
    <LiveStrip
      items={liveStripItems(data)}
      loading={isPending}
      live={data?.latestLedger != null && !isError}
      className={className}
    />
  );
}
