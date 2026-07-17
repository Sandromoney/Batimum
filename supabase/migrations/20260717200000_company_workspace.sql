-- =============================================================================
-- Batimum — Workspace entreprise (source de vérité métier)
-- Migration: 20260717200000_company_workspace.sql
-- Idempotent. À appliquer aussi via scripts/APPLY_COMPANY_WORKSPACE.sql
-- =============================================================================

-- 1) Colonnes opérationnelles + métier sur user_settings
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

comment on column public.user_settings.devis is
  'Devis de l''entreprise (source de vérité cloud).';
comment on column public.user_settings.factures is
  'Factures de l''entreprise (source de vérité cloud).';
comment on column public.user_settings.commandes is
  'Commandes liées aux devis.';
comment on column public.user_settings.local_import_completed_at is
  'Horodatage de l''import unique des données localStorage legacy.';

-- 2) Droits PostgreSQL (corrige 42501)
grant usage on schema public to authenticated, service_role;
grant select, insert, update, delete on public.user_settings to authenticated;
grant all on public.user_settings to service_role;

-- 3) RLS (isolation stricte par user_id = company_id dirigeant)
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

-- 4) Index utiles
create index if not exists user_settings_updated_at_idx
  on public.user_settings (updated_at desc);

-- 5) Reload PostgREST schema cache
notify pgrst, 'reload schema';
