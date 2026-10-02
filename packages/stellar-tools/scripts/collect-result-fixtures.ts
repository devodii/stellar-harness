import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NETWORK_PROFILES } from '@harness/schema';
import { createClients } from '../src/core/clients';
import { loadNetworkConfig } from '../src/core/config';
import type { HttpLogLine } from '../src/core/log';
import type { RpcTransaction } from '../src/core/rpc';
import { decodeEnvelopeSummary } from '../src/decode/envelope';
import { decodeResultCodes } from '../src/decode/result-codes';

const MAX_CALLS = Number(process.env.MAX_CALLS ?? 1500);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);
const FIXTURES = join(import.meta.dirname, '..', 'src', 'decode', '__fixtures__');
const MAX_ENVELOPE_CHARS = 1200;

type Sample = {
  code: string;
  hash: string;
  ledger: number;
  resultXdr: string;
  opType?: string;
};

type EnvelopeSample = { label: string; hash: string; envelopeXdr: string };

const PATH_PAYMENTS = new Set(['path_payment_strict_receive', 'path_payment_strict_send']);
const OFFERS = new Set(['manage_sell_offer', 'manage_buy_offer', 'create_passive_sell_offer']);

type Match = { tx: string; failing: Array<{ opType: string; code: string }>; feeBump: boolean };

const TARGETS: Record<string, (match: Match) => string | null> = {
  tx_bad_seq: (m) => (m.tx === 'tx_bad_seq' ? m.tx : null),
  tx_insufficient_fee: (m) => (m.tx === 'tx_insufficient_fee' ? m.tx : null),
  tx_too_late: (m) => (m.tx === 'tx_too_late' ? m.tx : null),
  tx_bad_auth: (m) => (m.tx === 'tx_bad_auth' ? m.tx : null),
  tx_insufficient_balance: (m) => (m.tx === 'tx_insufficient_balance' ? m.tx : null),
  op_no_trust: (m) => (m.failing.some((f) => f.code === 'op_no_trust') ? 'op_no_trust' : null),
  op_underfunded: (m) =>
    m.failing.some((f) => f.code === 'op_underfunded') ? 'op_underfunded' : null,
  op_no_destination: (m) =>
    m.failing.some((f) => f.code === 'op_no_destination') ? 'op_no_destination' : null,
  op_low_reserve: (m) =>
    m.failing.some((f) => f.code === 'op_low_reserve') ? 'op_low_reserve' : null,
  op_line_full: (m) => (m.failing.some((f) => f.code === 'op_line_full') ? 'op_line_full' : null),
  fee_bump_inner_failed: (m) => (m.feeBump ? m.tx : null),
  function_trapped: (m) =>
    m.failing.some((f) => f.code === 'function_trapped') ? 'function_trapped' : null,
  path_payment_failure: (m) => m.failing.find((f) => PATH_PAYMENTS.has(f.opType))?.code ?? null,
  manage_offer_failure: (m) => m.failing.find((f) => OFFERS.has(f.opType))?.code ?? null,
};

const statuses = new Map<string, number>();
const log = (line: HttpLogLine) => {
  if (line.cached) return;
  const key = line.status === null ? `error:${line.error?.split(':')[0]}` : String(line.status);
  statuses.set(key, (statuses.get(key) ?? 0) + 1);
};

const main = async () => {
  const config = loadNetworkConfig();
  const clients = createClients(config, {
    log,
    limits: { [new URL(config.RPC_URL).host]: CONCURRENCY },
  });
  const health = await clients.rpc.getHealth();
  if (!health.ok) throw new Error(`getHealth failed: ${health.error.message}`);
  const { oldestLedger, latestLedger } = health.value;

  const samples = new Map<string, Sample>();
  const byCode = new Map<string, Sample>();
  const envelopes = new Map<string, EnvelopeSample>();
  let scannedTx = 0;
  let failedTx = 0;

  const consider = (tx: RpcTransaction) => {
    scannedTx += 1;
    if (tx.status !== 'FAILED') return;
    failedTx += 1;
    const decoded = decodeResultCodes(tx.resultXdr);
    const summary = decodeEnvelopeSummary(tx.envelopeXdr, NETWORK_PROFILES.mainnet.passphrase);
    const failing = decoded.ops
      .map((code, index) => ({ code, opType: summary.opTypes[index] ?? 'unknown' }))
      .filter((op) => op.code !== 'op_success');
    const match: Match = { tx: decoded.tx, failing, feeBump: decoded.feeBump };
    const base = { hash: tx.txHash, ledger: tx.ledger, resultXdr: tx.resultXdr };
    for (const [target, test] of Object.entries(TARGETS)) {
      if (samples.has(target)) continue;
      const code = test(match);
      if (!code) continue;
      const opType = failing.find((op) => op.code === code)?.opType;
      samples.set(target, { code, ...base, ...(opType ? { opType } : {}) });
    }
    const primary = failing[0];
    const primaryCode = decoded.tx === 'tx_failed' && primary ? primary.code : decoded.tx;
    if (!byCode.has(primaryCode)) {
      byCode.set(primaryCode, {
        code: primaryCode,
        ...base,
        ...(primary ? { opType: primary.opType } : {}),
      });
    }
    if (tx.envelopeXdr.length <= MAX_ENVELOPE_CHARS) {
      const label = summary.feeBump
        ? 'fee_bump'
        : summary.memoType !== 'none'
          ? `memo_${summary.memoType}`
          : summary.opTypes.length > 1
            ? 'multi_op'
            : `single_${summary.opTypes[0]}`;
      if (!envelopes.has(label))
        envelopes.set(label, { label, hash: tx.txHash, envelopeXdr: tx.envelopeXdr });
    }
  };

  const span = latestLedger - oldestLedger - 10;
  const starts = Array.from({ length: MAX_CALLS }, (_, i) => {
    const offset = Math.floor(((i * 0.6180339887) % 1) * span);
    return latestLedger - 5 - offset;
  });

  const started = performance.now();
  let calls = 0;
  let next = 0;
  const done = () => samples.size === Object.keys(TARGETS).length;
  const worker = async () => {
    while (next < starts.length && !done()) {
      const startLedger = starts[next++] as number;
      calls += 1;
      const page = await clients.rpc.getTransactions({ startLedger, limit: 200 });
      if (!page.ok) {
        process.stderr.write(`page ${startLedger} failed: ${page.error.message}\n`);
        continue;
      }
      for (const tx of page.value.transactions) consider(tx);
      if (calls % 50 === 0) {
        const seconds = (performance.now() - started) / 1000;
        process.stderr.write(
          `${calls} calls, ${(calls / seconds).toFixed(2)} req/s, ${samples.size}/${Object.keys(TARGETS).length} targets\n`,
        );
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const seconds = (performance.now() - started) / 1000;

  const fixtures = [...samples.entries()].map(([target, sample]) => ({ target, ...sample }));
  for (const sample of byCode.values()) {
    if (!fixtures.some((fixture) => fixture.hash === sample.hash)) {
      fixtures.push({ target: `code:${sample.code}`, ...sample });
    }
  }
  await writeFile(join(FIXTURES, 'result-xdr.json'), `${JSON.stringify(fixtures, null, 2)}\n`);
  await writeFile(
    join(FIXTURES, 'envelope-xdr.json'),
    `${JSON.stringify([...envelopes.values()], null, 2)}\n`,
  );

  const missing = Object.keys(TARGETS).filter((target) => !samples.has(target));
  const report = {
    window: { oldestLedger, latestLedger },
    calls,
    seconds: Math.round(seconds),
    requestsPerSecond: Number((calls / seconds).toFixed(2)),
    concurrency: CONCURRENCY,
    scannedTx,
    failedTx,
    statuses: Object.fromEntries(statuses),
    http: clients.http.stats.totals(),
    found: [...samples.keys()],
    missing,
    distinctCodes: [...byCode.keys()].sort(),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
};

await main();
