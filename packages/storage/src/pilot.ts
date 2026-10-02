import type { Sql } from './pg';

export type PilotRequest = { email: string; userAgent: string };

export const addPilotRequest = async (sql: Sql, request: PilotRequest): Promise<number> => {
  await sql`insert into pilot_requests (email, user_agent) values (${request.email}, ${request.userAgent})`;
  const [row] = await sql<{ count: number }[]>`select count(*)::int as count from pilot_requests`;
  return row?.count ?? 0;
};
