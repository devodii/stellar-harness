import { Address } from '@/components/address';
import { BracketTag } from '@/components/bracket-tag';
import { KeyValueList } from '@/components/key-value-list';
import { ResultCodes } from '@/components/result-codes';
import { ResultSection } from '@/components/result-section';
import { StatLabel } from '@/components/stat';
import { useExplorer } from '@/hooks/use-explorer';
import { formatDateTime, formatInt } from '@/lib/format';
import type { TransactionView as TransactionViewData } from '@/lib/tool-views';

const timeboundsText = (timebounds: TransactionViewData['timebounds']): string => {
  if (!timebounds) return 'none';
  const min = timebounds.minTime ? formatDateTime(timebounds.minTime) : '0';
  const max = timebounds.maxTime ? formatDateTime(timebounds.maxTime) : 'unbounded';
  return `${min} to ${max}`;
};

export function TransactionView({ transaction }: { transaction: TransactionViewData }) {
  const { explorerUrl } = useExplorer();
  return (
    <ResultSection
      title={
        <Address
          value={transaction.hash}
          head={8}
          tail={8}
          href={explorerUrl('tx', transaction.hash)}
        />
      }
      aside={
        transaction.successful ? (
          <BracketTag label="success" tone="success" />
        ) : (
          <BracketTag label="failed" tone="destructive" emphasis />
        )
      }
    >
      <ResultCodes codes={transaction.resultCodes} />
      <KeyValueList
        items={[
          {
            label: 'source',
            value: (
              <Address
                value={transaction.source}
                href={explorerUrl('account', transaction.source)}
              />
            ),
          },
          { label: 'ledger', value: formatInt(transaction.ledger) },
          { label: 'created', value: formatDateTime(transaction.createdAt) },
          {
            label: 'fee',
            value: `${formatInt(transaction.feeCharged)} of ${formatInt(transaction.maxFee)} stroops`,
          },
          { label: 'memo', value: transaction.memoType },
          { label: 'timebounds', value: timeboundsText(transaction.timebounds) },
          {
            label: 'fee bump',
            value: transaction.feeBump ? <Address value={transaction.feeBump.feeSource} /> : 'no',
          },
        ]}
      />
      {transaction.operations.length > 0 && (
        <div className="space-y-1">
          <StatLabel>operations ({transaction.operationCount})</StatLabel>
          <ol className="space-y-0.5 font-mono text-xs">
            {transaction.operations
              .map((operation, index) => ({ ...operation, label: `op${index + 1}` }))
              .map((operation) => (
                <li key={operation.label} className="flex items-center gap-2">
                  <span className="w-8 text-muted-foreground">{operation.label}</span>
                  <span className="text-foreground">{operation.type}</span>
                  {operation.source && <Address value={operation.source} copyable={false} />}
                </li>
              ))}
          </ol>
        </div>
      )}
    </ResultSection>
  );
}
