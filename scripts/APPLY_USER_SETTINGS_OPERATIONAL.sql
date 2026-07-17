-- =============================================================================
-- Alias : même contenu que APPLY_COMPANY_WORKSPACE.sql
-- À EXÉCUTER UNE FOIS dans Supabase → SQL Editor
-- =============================================================================

alter table public.user_settings
  add column if not exists planning jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists chantiers jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists affectations jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists clients jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists devis jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists factures jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists commandes jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists avoirs jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists notifications jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists deleted_notification_keys jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists relances jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists bibliotheque_entreprise jsonb not null default '{}'::jsonb;
alter table public.user_settings
  add column if not exists mum_ia_historique jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists chantier_time_entries jsonb not null default '[]'::jsonb;
alter table public.user_settings
  add column if not exists local_import_completed_at timestamptz;

grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;

alter table public.user_settings enable row level security;

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
  on public.user_settings for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
  on public.user_settings for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
  on public.user_settings for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own settings" on public.user_settings;
create policy "Users can delete own settings"
  on public.user_settings for delete to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_settings_select_own" on public.user_settings;
drop policy if exists "user_settings_insert_own" on public.user_settings;
drop policy if exists "user_settings_update_own" on public.user_settings;

create index if not exists user_settings_updated_at_idx
  on public.user_settings (updated_at desc);

notify pgrst, 'reload schema';
