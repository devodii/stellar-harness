export type Migration = { id: string; sql: string };

export const MIGRATIONS: Migration[] = [
  {
    id: '0001_pilot_requests',
    sql: `
      create table pilot_requests (
        id bigserial primary key,
        email text not null,
        created_at timestamptz not null default now(),
        user_agent text not null default ''
      );
    `,
  },
];
