import { FINDING_TYPES, SUGGESTED_ACTION } from '@harness/schema';
import { closeSql, createSql } from '@harness/storage';
import { loadDotEnv } from './env';

loadDotEnv();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const sql = createSql(databaseUrl);
try {
  let updated = 0;
  for (const type of FINDING_TYPES) {
    const action = SUGGESTED_ACTION[type];
    const result = await sql`
      update findings
      set body = jsonb_set(body, '{suggestedAction}', to_jsonb(${action}::text))
      where type = ${type} and body->>'suggestedAction' is distinct from ${action}
    `;
    updated += result.count;
  }
  console.log(`refreshed suggested actions on ${updated} findings`);
} finally {
  await closeSql(databaseUrl);
}
