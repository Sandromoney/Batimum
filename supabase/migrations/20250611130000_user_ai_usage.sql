-- Suivi des demandes MUM IA par période d'abonnement
create table if not exists public.user_ai_usage (
  user_id uuid primary key references auth.users (id) on delete cascade,
  subscription_start_date timestamptz,
  current_period_start timestamptz not null default now(),
  current_period_end timestamptz not null default (now() + interval '30 days'),
  ai_requests_used integer not null default 0,
  ai_requests_limit integer not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.user_ai_usage enable row level security;

drop policy if exists "Users read own ai usage" on public.user_ai_usage;
create policy "Users read own ai usage"
  on public.user_ai_usage
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users update own ai usage" on public.user_ai_usage;
create policy "Users update own ai usage"
  on public.user_ai_usage
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users insert own ai usage" on public.user_ai_usage;
create policy "Users insert own ai usage"
  on public.user_ai_usage
  for insert
  with check (auth.uid() = user_id);
