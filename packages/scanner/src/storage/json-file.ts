import { join } from 'node:path';
import { Finding, Summary } from '../schema';
import { appendJsonl, readJson, readJsonl, writeJson } from './jsonl';

export class JsonFileStorage {
  readonly findingsPath: string;
  readonly summaryPath: string;
  #findings: Promise<Map<string, Finding>> | null = null;

  constructor(dataDir: string) {
    this.findingsPath = join(dataDir, 'findings.jsonl');
    this.summaryPath = join(dataDir, 'summary.json');
  }

  #load(): Promise<Map<string, Finding>> {
    this.#findings ??= readJsonl(this.findingsPath, Finding).then(
      (rows) => new Map(rows.map((row) => [row.findingId, row])),
    );
    return this.#findings;
  }

  async putFindings(findings: Finding[]): Promise<void> {
    const existing = await this.#load();
    const fresh = findings.filter((finding) => !existing.has(finding.findingId));
    for (const finding of fresh) existing.set(finding.findingId, finding);
    await appendJsonl(this.findingsPath, fresh);
  }

  async getFinding(findingId: string): Promise<Finding | null> {
    return (await this.#load()).get(findingId) ?? null;
  }

  async listFindings(): Promise<Finding[]> {
    return [...(await this.#load()).values()];
  }

  async getSummary(): Promise<Summary | null> {
    return readJson(this.summaryPath, Summary);
  }

  async putSummary(summary: Summary): Promise<void> {
    await writeJson(this.summaryPath, Summary.parse(summary));
  }
}
