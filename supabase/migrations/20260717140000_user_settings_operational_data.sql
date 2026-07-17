-- Données opérationnelles partagées dirigeant ↔ employés (planning, chantiers, affectations).
-- Idempotent.

alter table public.user_settings
  add column if not exists planning jsonb not null default '[]'::jsonb;

alter table public.user_settings
  add column if not exists chantiers jsonb not null default '[]'::jsonb;

alter table public.user_settings
  add column if not exists affectations jsonb not null default '[]'::jsonb;

alter table public.user_settings
  add column if not exists clients jsonb not null default '[]'::jsonb;

comment on column public.user_settings.planning is
  'Événements planning partagés avec les comptes employés.';
comment on column public.user_settings.chantiers is
  'Chantiers partagés avec les comptes employés.';
comment on column public.user_settings.affectations is
  'Affectations employés ↔ chantiers/planning.';
comment on column public.user_settings.clients is
  'Clients (libellés) utiles au planning employé.';

notify pgrst, 'reload schema';
