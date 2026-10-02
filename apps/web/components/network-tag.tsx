'use client';

import { DEFAULT_NETWORK, NETWORK_PROFILES } from '@harness/schema';
import { BracketTag } from '@/components/bracket-tag';
import { useNetwork } from '@/components/network-provider';

export function NetworkTag({ className }: { className?: string }) {
  const { network } = useNetwork();
  if (network === DEFAULT_NETWORK) return null;
  return (
    <BracketTag
      label={network}
      tone="warning"
      title={`${NETWORK_PROFILES[network].label}: test data, reset periodically`}
      className={className}
    />
  );
}
