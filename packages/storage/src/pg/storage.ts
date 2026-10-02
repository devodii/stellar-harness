import {
  Finding,
  type FindingQuery,
  type Network,
  SEVERITIES,
  Snapshot,
  Summary,
} from '@harness/schema';
import { DEFAULT_LIMIT } from '../query';
import type { FindingPage, Storage } from '../storage';
import { chunk } from './batch';
import { insertFindings } from './findings';
import { type Sql, toJson } from './sql';

const INSERT_BATCH = 1000;

export class PostgresStorage implements Storage {
  readonly #sql: Sql;
  readonly network: Network;

  constructor(sql: Sql, network: Network) {
    this.#sql = sql;
    this.network = network;
  }

  async putFindings(findings: Finding[]): Promise<void> {
    for (const batch of chunk(findings, INSERT_BATCH)) {
      await insertFindings(this.#sql, this.network, batch);
    }
  }

  #where(query: FindingQuery) {
    const sql = this.#sql;
    const filters = [sql`network = ${this.network}`];
    if (query.type?.length) filters.push(sql`type = any(${query.type}::text[])`);
    if (query.severity?.length) filters.push(sql`severity = any(${query.severity}::text[])`);
    if (query.subject) filters.push(sql`subject = ${query.subject}`);
    if (query.tags?.length) filters.push(sql`tags @> ${query.tags}::text[]`);
    return filters.reduce((all, filter) => sql`${all} and ${filter}`);
  }

  async queryFindings(query: FindingQuery): Promise<FindingPage> {
    const sql = this.#sql;
    const where = this.#where(query);
    const [rows, [counted]] = await Promise.all([
      sql<{ body: unknown }[]>`
        select body from findings
        where ${where}
        order by array_position(${[...SEVERITIES]}::text[], severity),
          subject collate "und-x-icu",
          finding_id
        limit ${query.limit ?? DEFAULT_LIMIT}
        offset ${query.offset ?? 0}
      `,
      sql<{ total: number }[]>`select count(*)::int as total from findings where ${where}`,
    ]);
    return { rows: rows.map((row) => Finding.parse(row.body)), total: counted?.total ?? 0 };
  }

  async getFinding(findingId: string): Promise<Finding | null> {
    const [row] = await this.#sql<{ body: unknown }[]>`
      select body from findings where network = ${this.network} and finding_id = ${findingId}
    `;
    return row ? Finding.parse(row.body) : null;
  }

  async getSummary(): Promise<Summary | null> {
    const [row] = await this.#sql<{ body: unknown }[]>`
      select body from summaries where network = ${this.network}
    `;
    return row ? Summary.parse(row.body) : null;
  }

  async putSummary(summary: Summary): Promise<void> {
    const valid = Summary.parse(summary);
    await this.#sql`
      insert into summaries (network, snapshot_ledger, body, updated_at)
      values (${this.network}, ${valid.snapshot.snapshotLedger}, ${this.#sql.json(toJson(valid))}, now())
      on conflict (network) do update
      set snapshot_ledger = excluded.snapshot_ledger, body = excluded.body, updated_at = now()
    `;
  }

  async getSnapshot(): Promise<Snapshot | null> {
    const summary = await this.getSummary();
    if (summary) return summary.snapshot;
    const [row] = await this.#sql<{ body: unknown }[]>`
      select body from snapshots where network = ${this.network}
    `;
    return row ? Snapshot.parse(row.body) : null;
  }
}
