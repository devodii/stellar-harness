import {
  Finding,
  type FindingQuery,
  type Snapshot,
  Summary,
  WaitlistEntry,
} from '@harness/schema';
import Database from 'better-sqlite3';
import { queryFindingRows } from './query';
import type { FindingPage, Storage } from './storage';

// TODO: wire in M7 if needed
export class SqliteStorage implements Storage {
  readonly #db: Database.Database;

  constructor(path: string) {
    this.#db = new Database(path);
    this.#db.exec(`
      create table if not exists findings (id text primary key, body text not null);
      create table if not exists summary (id integer primary key check (id = 1), body text not null);
      create table if not exists waitlist (id integer primary key autoincrement, body text not null);
    `);
  }

  #rows(): Finding[] {
    const rows = this.#db.prepare('select body from findings').all() as { body: string }[];
    return rows.map((row) => Finding.parse(JSON.parse(row.body)));
  }

  async putFindings(findings: Finding[]): Promise<void> {
    const insert = this.#db.prepare('insert or ignore into findings (id, body) values (?, ?)');
    this.#db.transaction((rows: Finding[]) => {
      for (const row of rows) insert.run(row.findingId, JSON.stringify(row));
    })(findings);
  }

  async queryFindings(query: FindingQuery): Promise<FindingPage> {
    return queryFindingRows(this.#rows(), query);
  }

  async getFinding(findingId: string): Promise<Finding | null> {
    const row = this.#db.prepare('select body from findings where id = ?').get(findingId) as
      { body: string } | undefined;
    return row ? Finding.parse(JSON.parse(row.body)) : null;
  }

  async getSummary(): Promise<Summary | null> {
    const row = this.#db.prepare('select body from summary where id = 1').get() as
      { body: string } | undefined;
    return row ? Summary.parse(JSON.parse(row.body)) : null;
  }

  async putSummary(summary: Summary): Promise<void> {
    this.#db
      .prepare('insert or replace into summary (id, body) values (1, ?)')
      .run(JSON.stringify(Summary.parse(summary)));
  }

  async getSnapshot(): Promise<Snapshot | null> {
    return (await this.getSummary())?.snapshot ?? null;
  }

  async putWaitlist(entry: WaitlistEntry): Promise<void> {
    this.#db
      .prepare('insert into waitlist (body) values (?)')
      .run(JSON.stringify(WaitlistEntry.parse(entry)));
  }

  async countWaitlist(): Promise<number> {
    const row = this.#db.prepare('select count(*) as total from waitlist').get() as { total: number };
    return row.total;
  }
}
