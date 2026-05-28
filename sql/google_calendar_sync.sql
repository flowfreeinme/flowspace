alter table public.calendar_events
  add column if not exists external_id text;

create unique index if not exists calendar_events_external_source_idx
  on public.calendar_events(user_id, source, external_id);

create table if not exists public.google_calendar_connections (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  sync_token text,
  watch_channel_id text,
  watch_resource_id text,
  watch_expires_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_calendar_connections enable row level security;

create index if not exists google_calendar_connections_watch_channel_idx
  on public.google_calendar_connections(watch_channel_id)
  where watch_channel_id is not null;

comment on table public.google_calendar_connections is
  'Server-side Google Calendar OAuth refresh tokens and sync metadata. RLS intentionally exposes no user policies; trusted API/service role code owns access.';
