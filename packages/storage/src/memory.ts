import type { Finding, FindingQuery, Snapshot, Summary, WaitlistEntry } from '@harness/schema';
import { queryFindingRows } from './query';
import type { FindingPage, Storage } from './storage';

export class MemoryStorage implements Storage {
  readonly #findings = new Map<string, Finding>();
  #summary: Summary | null;
  readonly #waitlist: WaitlistEntry[] = [];

  constructor(seed: { findings?: Finding[]; summary?: Summary | null } = {}) {
    this.#summary = seed.summary ?? null;
    for (const finding of seed.findings ?? []) this.#findings.set(finding.findingId, finding);
  }

  async putFindings(findings: Finding[]): Promise<void> {
    for (const finding of findings) this.#findings.set(finding.findingId, finding);
  }

  async queryFindings(query: FindingQuery): Promise<FindingPage> {
    return queryFindingRows(this.#findings.values(), query);
  }

  async getFinding(findingId: string): Promise<Finding | null> {
    return this.#findings.get(findingId) ?? null;
  }

  async getSummary(): Promise<Summary | null> {
    return this.#summary;
  }

  async putSummary(summary: Summary): Promise<void> {
    this.#summary = summary;
  }

  async getSnapshot(): Promise<Snapshot | null> {
    return this.#summary?.snapshot ?? null;
  }

  async putWaitlist(entry: WaitlistEntry): Promise<void> {
    this.#waitlist.push(entry);
  }

  async countWaitlist(): Promise<number> {
    return this.#waitlist.length;
  }
}
