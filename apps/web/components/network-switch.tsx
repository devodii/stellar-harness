'use client';

import { useNetwork } from '@/components/network-provider';
import { NetworkSelect, type NetworkSelectProps } from '@/components/network-select';

export type NetworkSwitchProps = Omit<NetworkSelectProps, 'value' | 'onValueChange' | 'pending'>;

export function NetworkSwitch(props: NetworkSwitchProps) {
  const { network, pending, setNetwork } = useNetwork();
  return (
    <NetworkSelect
      {...props}
      value={network}
      pending={pending}
      onValueChange={(next) => void setNetwork(next)}
    />
  );
}
