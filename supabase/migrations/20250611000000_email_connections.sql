-- Connexions email OAuth (Gmail / Microsoft) liées à Supabase Auth
create table if not exists public.email_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  provider text not null check (provider in ('gmail', 'microsoft')),
  email text not null,
  access_token text not null,
  refresh_token text,
  expires_at timestamptz not null,
  connected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, provider)
);

create index if not exists email_connections_user_id_idx
  on public.email_connections (user_id);

alter table public.email_connections enable row level security;

drop policy if exists "Users can read own email connections" on public.email_connections;
create policy "Users can read own email connections"
  on public.email_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own email connections" on public.email_connections;
create policy "Users can insert own email connections"
  on public.email_connections
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own email connections" on public.email_connections;
create policy "Users can update own email connections"
  on public.email_connections
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own email connections" on public.email_connections;
create policy "Users can delete own email connections"
  on public.email_connections
  for delete
  using (auth.uid() = user_id);

-- Migration depuis l'ancien schéma (colonnes *_encrypted)
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_connections'
      and column_name = 'access_token_encrypted'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_connections'
      and column_name = 'access_token'
  ) then
    alter table public.email_connections
      rename column access_token_encrypted to access_token;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_connections'
      and column_name = 'refresh_token_encrypted'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'email_connections'
      and column_name = 'refresh_token'
  ) then
    alter table public.email_connections
      rename column refresh_token_encrypted to refresh_token;
  end if;
end $$;
