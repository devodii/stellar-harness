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
  {
    id: '0002_report_files',
    sql: `
      create table report_files (
        name text primary key,
        body text not null,
        sha256 text not null,
        row_count integer not null,
        published_at timestamptz not null default now()
      );
    `,
  },
];
