import 'server-only';
import { createSql, migrate } from '@harness/storage/pg';
import { getDbEnv } from './env';
import { memo } from './memo';

const getSql = memo(() => createSql(getDbEnv().DATABASE_URL));

let migrating: Promise<unknown> | null = null;

export const db = async () => {
  migrating ??= migrate(getSql()).catch((error) => {
    migrating = null;
    throw error;
  });
  await migrating;
  return getSql();
};
