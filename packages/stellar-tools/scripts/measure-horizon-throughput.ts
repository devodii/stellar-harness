import { createClients } from '../src/core/clients';
import { loadNetworkConfig } from '../src/core/config';
import type { HttpLogLine } from '../src/core/log';

const REQUESTS = Number(process.env.REQUESTS ?? 200);
const CONCURRENCY = Number(process.env.CONCURRENCY ?? 8);

const statuses = new Map<string, number>();
const log = (line: HttpLogLine) => {
  const key = line.status === null ? 'error' : String(line.status);
  statuses.set(key, (statuses.get(key) ?? 0) + 1);
};

const main = async () => {
  const config = loadNetworkConfig();
  const clients = createClients(config, {
    log,
    limits: { [new URL(config.HORIZON_URL).host]: CONCURRENCY },
  });
  const latest = await clients.horizon.latestLedger();
  if (!latest.ok) throw new Error(latest.error.message);
  const ledgers = Array.from({ length: REQUESTS }, (_, i) => latest.value.sequence - 10 - i * 97);

  const started = performance.now();
  let transactions = 0;
  let next = 0;
  const worker = async () => {
    while (next < ledgers.length) {
      const seq = ledgers[next++] as number;
      const result = await clients.horizon.ledgerTransactions(seq);
      if (result.ok) transactions += result.value.length;
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  const seconds = (performance.now() - started) / 1000;
  const network = clients.http.stats.totals().network;
  process.stdout.write(
    `${JSON.stringify(
      {
        ledgers: REQUESTS,
        concurrency: CONCURRENCY,
        seconds: Math.round(seconds),
        networkCalls: network,
        requestsPerSecond: Number((network / seconds).toFixed(2)),
        transactions,
        statuses: Object.fromEntries(statuses),
        stats: clients.http.stats.totals(),
      },
      null,
      2,
    )}\n`,
  );
};

await main();
