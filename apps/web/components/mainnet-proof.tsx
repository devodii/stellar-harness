import { formatCount } from '@/lib/live-view';

export interface MainnetProofProps {
  preventable: number;
  failed: number;
}

export function MainnetProof({ preventable, failed }: MainnetProofProps) {
  if (failed === 0) return null;
  return (
    <p className="text-sm">
      In the last 24 hours on Stellar mainnet,{' '}
      <span className="font-medium">{formatCount(preventable)}</span> of {formatCount(failed)}{' '}
      failed transactions could have been prevented by a check.
    </p>
  );
}
