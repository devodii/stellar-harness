import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { createSql, migrate } from '@harness/storage/pg';
import { publishReportFiles, readReportDir } from '@harness/storage/report';

const envPath = join(import.meta.dirname, '..', '.env');
if (existsSync(envPath)) process.loadEnvFile(envPath);

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

const dir = process.argv[2] ?? 'data';
const sql = createSql(url);
try {
  await migrate(sql);
  const files = await readReportDir(dir);
  await publishReportFiles(sql, files);
  for (const file of files) {
    const size = Buffer.byteLength(file.body, 'utf8');
    console.log(`${file.name}\t${file.rowCount} rows\t${file.sha256.slice(0, 12)}\t${size} bytes`);
  }
} finally {
  await sql.end();
}
