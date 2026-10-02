import { type Network, Snapshot } from '@harness/schema';
import { batched } from './batch';
import { type Sql, toJson } from './sql';

const DERIVED_BATCH = 1000;
const READ_BATCH = 500;

export const ARTIFACT_KINDS = ['previews', 'runs', 'derived', 'state'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export type DerivedRow = { seq: number; body: unknown };

export const insertDerivedRows = async (
  sql: Sql,
  network: Network,
  name: string,
  rows: readonly DerivedRow[],
): Promise<number> => {
  if (rows.length === 0) return 0;
  const values = rows.map((row) => ({
    network,
    name,
    seq: row.seq,
    body: sql.json(toJson(row.body)),
  }));
  const result = await sql`
    insert into derived_rows ${sql(values, 'network', 'name', 'seq', 'body')}
    on conflict (network, name, seq) do nothing
  `;
  return result.count;
};

export const maxDerivedSeq = async (sql: Sql, network: Network, name: string) => {
  const [row] = await sql<{ seq: string | null }[]>`
    select max(seq)::text as seq from derived_rows where network = ${network} and name = ${name}
  `;
  return row?.seq ? Number(row.seq) : 0;
};

export class PgScanStore {
  readonly #sql: Sql;
  readonly network: Network;

  constructor(sql: Sql, network: Network) {
    this.#sql = sql;
    this.network = network;
  }

  async getSnapshot(): Promise<Snapshot | null> {
    const [row] = await this.#sql<{ body: unknown }[]>`
      select body from snapshots where network = ${this.network}
    `;
    return row ? Snapshot.parse(row.body) : null;
  }

  async putSnapshot(snapshot: Snapshot): Promise<void> {
    const body = this.#sql.json(toJson(Snapshot.parse(snapshot)));
    await this.#sql`
      insert into snapshots (network, body) values (${this.network}, ${body})
      on conflict (network) do update set body = excluded.body
    `;
  }

  async resetForSnapshot(): Promise<void> {
    await this.#sql.begin(async (tx) => {
      await tx`delete from findings where network = ${this.network}`;
      await tx`delete from derived_rows where network = ${this.network}`;
      await tx`delete from artifacts where network = ${this.network}`;
    });
  }

  async appendDerived(name: string, rows: AsyncIterable<unknown> | Iterable<unknown>) {
    const sql = this.#sql;
    let seq = await maxDerivedSeq(sql, this.network, name);
    let written = 0;
    for await (const batch of batched(rows, { maxRows: DERIVED_BATCH })) {
      const numbered = batch.map((body) => ({ seq: ++seq, body }));
      written += await insertDerivedRows(sql, this.network, name, numbered);
    }
    return written;
  }

  async clearDerived(...names: string[]): Promise<void> {
    if (names.length === 0) return;
    await this.#sql`
      delete from derived_rows where network = ${this.network} and name = any(${names}::text[])
    `;
  }

  async *readDerived(name: string): AsyncIterable<unknown> {
    const cursor = this.#sql<{ body: unknown }[]>`
      select body from derived_rows
      where network = ${this.network} and name = ${name}
      order by seq
    `.cursor(READ_BATCH);
    for await (const rows of cursor) for (const row of rows) yield row.body;
  }

  async putArtifact(kind: ArtifactKind, name: string, body: unknown): Promise<void> {
    await this.#sql`
      insert into artifacts (network, kind, name, body)
      values (${this.network}, ${kind}, ${name}, ${this.#sql.json(toJson(body))})
      on conflict (network, kind, name) do update set body = excluded.body
    `;
  }

  async getArtifact(kind: ArtifactKind, name: string): Promise<unknown | null> {
    const [row] = await this.#sql<{ body: unknown }[]>`
      select body from artifacts
      where network = ${this.network} and kind = ${kind} and name = ${name}
    `;
    return row ? row.body : null;
  }

  async listArtifacts(kind: ArtifactKind): Promise<unknown[]> {
    const rows = await this.#sql<{ body: unknown }[]>`
      select body from artifacts
      where network = ${this.network} and kind = ${kind}
      order by name collate "C"
    `;
    return rows.map((row) => row.body);
  }
}
