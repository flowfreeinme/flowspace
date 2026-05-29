-- Databases table: stores schema + views per database page
create table if not exists public.databases (
  id            uuid primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  title         text not null default 'Untitled',
  icon          text not null default '⊞',
  schema        jsonb not null default '[]',
  views         jsonb not null default '[]',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.databases enable row level security;

create policy "Users manage own databases"
  on public.databases for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Rows table: stores actual data rows
create table if not exists public.database_rows (
  id            uuid primary key,
  database_id   uuid not null references public.databases(id) on delete cascade,
  position      float8 not null default 0,
  properties    jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.database_rows enable row level security;

create policy "Users manage rows of own databases"
  on public.database_rows for all
  using (
    exists (
      select 1 from public.databases d
      where d.id = database_id and d.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.databases d
      where d.id = database_id and d.user_id = auth.uid()
    )
  );

create index if not exists idx_database_rows_db_pos on public.database_rows (database_id, position);
