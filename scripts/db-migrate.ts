import { closeSql, createSql, migrate } from '@harness/storage';
import { loadDotEnv } from './env';

loadDotEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

try {
  const applied = await migrate(createSql(databaseUrl));
  console.log(applied.length > 0 ? `applied: ${applied.join(', ')}` : 'schema is up to date');
} finally {
  await closeSql(databaseUrl);
}
