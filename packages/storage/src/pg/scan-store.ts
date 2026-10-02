import { type Network, Snapshot } from '@harness/schema';
import { batched } from './batch';
import { type Sql, toJson } from './sql';

const DERIVED_BATCH = 1000;
const DERIVED_BATCH_BYTES = 8 * 1024 * 1024;
const READ_BATCH = 500;

export const ARTIFACT_KINDS = ['previews', 'runs', 'derived', 'state'] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

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
    const [last] = await sql<{ seq: string | null }[]>`
      select max(seq)::text as seq from derived_rows
      where network = ${this.network} and name = ${name}
    `;
    let seq = last?.seq ? Number(last.seq) : 0;
    let written = 0;
    const encoded = async function* () {
      for await (const row of rows) yield toJson(row);
    };
    for await (const batch of batched(encoded(), {
      maxRows: DERIVED_BATCH,
      maxBytes: DERIVED_BATCH_BYTES,
      sizeOf: (row) => JSON.stringify(row).length,
    })) {
      const values = batch.map((body) => ({
        network: this.network,
        name,
        seq: ++seq,
        body: sql.json(body),
      }));
      await sql`insert into derived_rows ${sql(values, 'network', 'name', 'seq', 'body')}`;
      written += batch.length;
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
