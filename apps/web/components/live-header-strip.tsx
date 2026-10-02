'use client';

import { LiveStrip, type LiveStripItem } from '@/components/live-strip';
import { useLive } from '@/hooks/use-live';
import type { LiveResponse } from '@/lib/api-schemas';
import { formatDateTime, formatPercent, formatSeconds } from '@/lib/format';

const ledgerTitle = (live: LiveResponse | undefined): string | undefined => {
  if (!live?.ledgerSource) return undefined;
  const closed = live.closedAt ? `closed ${formatDateTime(live.closedAt)} UTC, ` : '';
  return `${closed}via ${live.ledgerSource}`;
};

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
  { id: 'archived', label: 'archived', value: live?.archivedContracts },
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
