create table if not exists public.rx_mastery_progress (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  progress   jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.rx_mastery_progress enable row level security;

create policy "Users manage own rx mastery progress"
  on public.rx_mastery_progress for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
