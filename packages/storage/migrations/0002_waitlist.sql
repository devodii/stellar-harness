create table if not exists waitlist (
  id bigserial primary key,
  email text not null,
  created_at timestamptz not null,
  user_agent text not null default ''
);
