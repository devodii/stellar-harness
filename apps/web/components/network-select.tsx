'use client';

import { DEFAULT_NETWORK, NETWORK_PROFILES, NETWORKS, type Network } from '@harness/schema';
import { cn } from 'cn';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

export interface NetworkSelectProps {
  value: Network;
  onValueChange: (network: Network) => void;
  networks?: readonly Network[];
  pending?: boolean;
  disabled?: boolean;
  className?: string;
}

const isNetwork = (value: string, networks: readonly Network[]): value is Network =>
  (networks as readonly string[]).includes(value);

export function NetworkSelect({
  value,
  onValueChange,
  networks = NETWORKS,
  pending = false,
  disabled = false,
  className,
}: NetworkSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        if (isNetwork(next, networks)) onValueChange(next);
      }}
      disabled={disabled || pending}
    >
      <SelectTrigger
        size="sm"
        aria-label="Network"
        aria-busy={pending}
        className={cn(
          'gap-1 rounded-sm border-transparent bg-transparent px-1 font-mono text-[11px] text-muted-foreground shadow-none hover:text-foreground data-[size=sm]:h-6 dark:bg-transparent dark:hover:bg-transparent [&_svg:not([class*=size-])]:size-3',
          value !== DEFAULT_NETWORK && 'text-warning hover:text-warning',
          className,
        )}
      >
        {pending && <Spinner className="size-3" />}
        <SelectValue />
      </SelectTrigger>
      <SelectContent position="popper" align="start" className="min-w-36">
        {networks.map((network) => (
          <SelectItem
            key={network}
            value={network}
            title={NETWORK_PROFILES[network].label}
            className="font-mono text-xs"
          >
            {network}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
