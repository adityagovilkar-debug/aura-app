-- AURA Health — Supabase setup.
-- Run this once in your project's SQL Editor (Supabase dashboard → SQL → New query).
-- It creates the sync table, locks it down so each user only sees their own rows,
-- and enables realtime so edits appear on your other devices live.

create table if not exists public.aura_records (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  kind       text        not null check (kind in ('day', 'template', 'settings')),
  key        text        not null,
  payload    jsonb,
  deleted    boolean     not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, key)
);

-- Row-level security: a signed-in user can only read/write rows they own.
alter table public.aura_records enable row level security;

drop policy if exists "aura own rows" on public.aura_records;
create policy "aura own rows"
  on public.aura_records
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Live updates across devices.
alter publication supabase_realtime add table public.aura_records;
