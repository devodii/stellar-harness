import type { FindingType, Severity } from '../../schema';
import { failureCodes } from './aggregate';
import type { FailedTx } from './rows';

export type ClusterType = Extract<
  FindingType,
  | 'TX_BAD_SEQ_CLUSTER'
  | 'TX_INSUFFICIENT_FEE_CLUSTER'
  | 'TX_TOO_LATE_CLUSTER'
  | 'TX_BAD_AUTH_CLUSTER'
  | 'OP_NO_TRUST_CLUSTER'
  | 'OP_UNDERFUNDED_CLUSTER'
  | 'OP_NO_DESTINATION_CLUSTER'
  | 'OP_LOW_RESERVE_CLUSTER'
  | 'OP_LINE_FULL_CLUSTER'
>;

export type ClusterRule = {
  type: ClusterType;
  codes: readonly string[];
  threshold: number;
  severity: Severity;
};

export const CLUSTER_RULES: readonly ClusterRule[] = [
  { type: 'TX_BAD_SEQ_CLUSTER', codes: ['tx_bad_seq'], threshold: 20, severity: 'high' },
  {
    type: 'TX_INSUFFICIENT_FEE_CLUSTER',
    codes: ['tx_insufficient_fee'],
    threshold: 20,
    severity: 'medium',
  },
  { type: 'TX_TOO_LATE_CLUSTER', codes: ['tx_too_late'], threshold: 10, severity: 'medium' },
  { type: 'TX_BAD_AUTH_CLUSTER', codes: ['tx_bad_auth'], threshold: 10, severity: 'medium' },
  { type: 'OP_NO_TRUST_CLUSTER', codes: ['op_no_trust'], threshold: 10, severity: 'high' },
  { type: 'OP_UNDERFUNDED_CLUSTER', codes: ['op_underfunded'], threshold: 10, severity: 'high' },
  {
    type: 'OP_NO_DESTINATION_CLUSTER',
    codes: ['op_no_destination'],
    threshold: 10,
    severity: 'medium',
  },
  {
    type: 'OP_LOW_RESERVE_CLUSTER',
    codes: ['op_low_reserve', 'tx_insufficient_balance'],
    threshold: 10,
    severity: 'medium',
  },
  { type: 'OP_LINE_FULL_CLUSTER', codes: ['op_line_full'], threshold: 10, severity: 'low' },
];

export type ClusterThresholds = Partial<Record<ClusterType, number>>;

export type ClusterEvidence = {
  count: number;
  firstLedger: number;
  lastLedger: number;
  sameLedgerCollisions: number;
  codes: Record<string, number>;
  sampleHashes: string[];
  accountFailures: number;
  topDestination?: string;
  asset?: string;
  sampleAmount?: string;
  topDestinationCount?: number;
};

export type ClusterCandidate = {
  type: ClusterType;
  account: string;
  severity: Severity;
  evidence: ClusterEvidence;
};

export type AccountActivity = { failures: number; opCount: number; invokeOps: number };

type RuleMatch = {
  count: number;
  firstLedger: number;
  lastLedger: number;
  ledgers: Map<number, number>;
  codes: Record<string, number>;
  sampleHashes: string[];
  targets: Map<string, PaymentTarget>;
};

type PaymentTarget = { destination: string; asset?: string; amount?: string; count: number };

type AccountState = AccountActivity & {
  failuresByLedger: Map<number, number>;
  matches: Map<ClusterType, RuleMatch>;
};

const SAMPLE_HASHES = 3;
const MAX_TRACKED_TARGETS = 1000;
const INVOKE_HOST_FUNCTION = 'invoke_host_function';

const bump = <K>(map: Map<K, number>, key: K) => map.set(key, (map.get(key) ?? 0) + 1);

const trackTarget = (targets: Map<string, PaymentTarget>, row: FailedTx) => {
  if (!row.payment) return;
  const key = `${row.payment.destination}|${row.payment.asset ?? ''}`;
  const existing = targets.get(key);
  if (existing) existing.count += 1;
  else if (targets.size < MAX_TRACKED_TARGETS) targets.set(key, { ...row.payment, count: 1 });
};

const topTarget = (targets: Map<string, PaymentTarget>) => {
  let top: PaymentTarget | undefined;
  for (const target of targets.values()) if (!top || target.count > top.count) top = target;
  if (!top) return {};
  return {
    topDestination: top.destination,
    topDestinationCount: top.count,
    ...(top.asset ? { asset: top.asset } : {}),
    ...(top.amount ? { sampleAmount: top.amount } : {}),
  };
};

export class ClusterAccumulator {
  private readonly accounts = new Map<string, AccountState>();

  constructor(private readonly rules: readonly ClusterRule[] = CLUSTER_RULES) {}

  private state(account: string): AccountState {
    const existing = this.accounts.get(account);
    if (existing) return existing;
    const created: AccountState = {
      failures: 0,
      opCount: 0,
      invokeOps: 0,
      failuresByLedger: new Map(),
      matches: new Map(),
    };
    this.accounts.set(account, created);
    return created;
  }

  add(rows: Iterable<FailedTx>): void {
    for (const row of rows) {
      const state = this.state(row.sourceAccount);
      state.failures += 1;
      state.opCount += row.opTypes.length;
      state.invokeOps += row.opTypes.filter((type) => type === INVOKE_HOST_FUNCTION).length;
      bump(state.failuresByLedger, row.ledger);

      const codes = failureCodes(row.resultCodes);
      for (const rule of this.rules) {
        const matched = codes.filter((code) => rule.codes.includes(code));
        if (matched.length === 0) continue;
        const match = state.matches.get(rule.type) ?? {
          count: 0,
          firstLedger: row.ledger,
          lastLedger: row.ledger,
          ledgers: new Map<number, number>(),
          codes: {},
          sampleHashes: [],
          targets: new Map<string, PaymentTarget>(),
        };
        match.count += 1;
        match.firstLedger = Math.min(match.firstLedger, row.ledger);
        match.lastLedger = Math.max(match.lastLedger, row.ledger);
        bump(match.ledgers, row.ledger);
        for (const code of matched) match.codes[code] = (match.codes[code] ?? 0) + 1;
        if (match.sampleHashes.length < SAMPLE_HASHES) match.sampleHashes.push(row.hash);
        trackTarget(match.targets, row);
        state.matches.set(rule.type, match);
      }
    }
  }

  get accountCount(): number {
    return this.accounts.size;
  }

  activity(account: string): AccountActivity | undefined {
    const state = this.accounts.get(account);
    return (
      state && { failures: state.failures, opCount: state.opCount, invokeOps: state.invokeOps }
    );
  }

  clusters(thresholds: ClusterThresholds = {}): ClusterCandidate[] {
    const candidates: ClusterCandidate[] = [];
    for (const [account, state] of this.accounts) {
      for (const rule of this.rules) {
        const match = state.matches.get(rule.type);
        const threshold = thresholds[rule.type] ?? rule.threshold;
        if (!match || match.count < threshold) continue;
        let sameLedgerCollisions = 0;
        for (const [ledger, count] of match.ledgers) {
          if ((state.failuresByLedger.get(ledger) ?? 0) >= 2) sameLedgerCollisions += count;
        }
        candidates.push({
          type: rule.type,
          account,
          severity: rule.severity,
          evidence: {
            count: match.count,
            firstLedger: match.firstLedger,
            lastLedger: match.lastLedger,
            sameLedgerCollisions,
            codes: { ...match.codes },
            sampleHashes: [...match.sampleHashes],
            accountFailures: state.failures,
            ...topTarget(match.targets),
          },
        });
      }
    }
    return candidates.sort(
      (a, b) => b.evidence.count - a.evidence.count || a.account.localeCompare(b.account),
    );
  }
}
