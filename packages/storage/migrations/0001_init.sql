create table http_cache (
  network text not null,
  key text not null,
  host text not null,
  url text not null,
  fetched_at timestamptz not null,
  status integer not null,
  headers jsonb not null,
  body text not null,
  primary key (network, key)
);

create index http_cache_host_idx on http_cache (network, host);

create table findings (
  network text not null,
  finding_id text not null,
  type text not null,
  severity text not null,
  subject text not null,
  subject_kind text not null,
  tags text[] not null default '{}',
  snapshot_ledger bigint not null,
  body jsonb not null,
  primary key (network, finding_id)
);

create index findings_type_idx on findings (network, type);
create index findings_severity_idx on findings (network, severity);
create index findings_subject_idx on findings (network, subject);
create index findings_tags_idx on findings using gin (tags);

create table summaries (
  network text primary key,
  snapshot_ledger bigint not null,
  body jsonb not null,
  updated_at timestamptz not null default now()
);

create table snapshots (
  network text primary key,
  body jsonb not null
);

create table derived_rows (
  network text not null,
  name text not null,
  seq bigint not null,
  body jsonb not null,
  primary key (network, name, seq)
);

create table artifacts (
  network text not null,
  kind text not null,
  name text not null,
  body jsonb not null,
  primary key (network, kind, name)
);
