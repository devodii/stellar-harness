import { copyFile, mkdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Finding } from '@harness/schema';
import { bySeverityThenSubject, readJsonl } from '@harness/storage';

const MAX_BYTES = 5 * 1024 * 1024;

const root = resolve(import.meta.dirname, '..');
const dataDir = resolve(root, process.env.HARNESS_DATA_DIR ?? './data');
const publicDir = join(dataDir, 'public');

const trimToBudget = (findings: Finding[], budget: number): string[] => {
  const lines: string[] = [];
  let size = 0;
  for (const finding of [...findings].sort(bySeverityThenSubject)) {
    const line = `${JSON.stringify(finding)}\n`;
    size += Buffer.byteLength(line);
    if (size > budget) break;
    lines.push(line);
  }
  return lines;
};

const main = async () => {
  await mkdir(publicDir, { recursive: true });
  await copyFile(join(dataDir, 'summary.json'), join(publicDir, 'summary.json'));
  const summaryBytes = (await stat(join(publicDir, 'summary.json'))).size;
  const findings = await readJsonl(join(dataDir, 'findings.jsonl'), Finding);
  const lines = trimToBudget(findings, MAX_BYTES - summaryBytes);
  await writeFile(join(publicDir, 'findings.jsonl'), lines.join(''));
  console.log(
    `public data: ${lines.length} of ${findings.length} findings, summary ${summaryBytes} bytes`,
  );
};

await main();
