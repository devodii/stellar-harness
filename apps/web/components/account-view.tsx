import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { KeyValueList } from '@/components/key-value-list';
import { ResultSection } from '@/components/result-section';
import { StatLabel } from '@/components/stat';
import { useExplorer } from '@/hooks/use-explorer';
import { formatDecimal } from '@/lib/format';
import type { AccountView as AccountViewData } from '@/lib/tool-views';

const assetLabel = (asset: string) => {
  const [code, issuer] = asset.split(':');
  return issuer ? { code: code ?? asset, issuer } : { code: asset, issuer: null };
};

const FLAG_LABELS: Record<keyof AccountViewData['flags'], string> = {
  authRequired: 'auth_required',
  authRevocable: 'auth_revocable',
  authImmutable: 'auth_immutable',
  authClawbackEnabled: 'clawback',
};

export function AccountView({ account }: { account: AccountViewData }) {
  const { explorerUrl } = useExplorer();
  const flags = Object.entries(account.flags)
    .filter(([, on]) => on)
    .map(([flag]) => FLAG_LABELS[flag as keyof AccountViewData['flags']]);

  return (
    <ResultSection
      title={<Address value={account.address} href={explorerUrl('account', account.address)} />}
      aside={
        account.exists ? (
          <BracketTag label="exists" tone="success" />
        ) : (
          <BracketTag label="not found" tone="destructive" emphasis />
        )
      }
    >
      <KeyValueList
        items={[
          { label: 'home domain', value: account.homeDomain ?? 'none' },
          { label: 'sequence', value: account.sequence ?? 'n/a' },
          {
            label: 'thresholds',
            value: `${account.thresholds.low}/${account.thresholds.med}/${account.thresholds.high}`,
          },
          { label: 'signers', value: account.signers.length },
          { label: 'subentries', value: account.subentryCount },
          {
            label: 'sponsoring',
            value: `${account.numSponsoring} out, ${account.numSponsored} in`,
          },
          { label: 'flags', value: flags.length ? flags.join(' ') : 'none' },
        ]}
      />
      {account.balances.length > 0 && (
        <div className="space-y-1">
          <StatLabel>balances</StatLabel>
          <ul className="divide-y divide-border rounded-md border border-border">
            {account.balances.map((balance) => {
              const { code, issuer } = assetLabel(balance.asset);
              return (
                <li
                  key={balance.asset}
                  className="flex items-center justify-between gap-3 px-2 py-1 font-mono text-xs"
                >
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="text-foreground">{code}</span>
                    {issuer && <Address value={issuer} copyable={false} />}
                  </span>
                  <span className="tabular-nums text-foreground">
                    {formatDecimal(Number(balance.balance), 7)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </ResultSection>
  );
}
