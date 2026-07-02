-- Période de crédits MUM IA basée sur la date anniversaire d'abonnement
alter table public.user_ai_usage
  add column if not exists mum_ia_quota_monthly integer not null default 100,
  add column if not exists mum_ia_used_current_period integer not null default 0,
  add column if not exists current_credit_period_start timestamptz,
  add column if not exists current_credit_period_end timestamptz,
  add column if not exists last_mum_ia_generation_ids jsonb not null default '[]'::jsonb;

comment on column public.user_ai_usage.mum_ia_quota_monthly is
  'Crédits MUM IA inclus par période mensuelle (abonnement entreprise).';
comment on column public.user_ai_usage.mum_ia_used_current_period is
  'Devis MUM IA générés avec succès durant la période de crédit en cours.';
comment on column public.user_ai_usage.current_credit_period_start is
  'Début de la période de crédit mensuelle (date anniversaire abonnement).';
comment on column public.user_ai_usage.current_credit_period_end is
  'Fin / renouvellement de la période de crédit mensuelle.';
comment on column public.user_ai_usage.last_mum_ia_generation_ids is
  'IDs de génération déjà décomptés (anti double-comptage).';

update public.user_ai_usage
set
  mum_ia_quota_monthly = coalesce(
    nullif(mum_ia_quota_monthly, 0),
    nullif(quota_mum_ia_mensuel, 0),
    nullif(ai_requests_limit, 0),
    100
  ),
  mum_ia_used_current_period = coalesce(
    mum_ia_used_current_period,
    mum_ia_utilises_mois,
    ai_requests_used,
    0
  ),
  current_credit_period_start = coalesce(
    current_credit_period_start,
    current_period_start,
    subscription_start_date,
    now()
  ),
  current_credit_period_end = coalesce(
    current_credit_period_end,
    current_period_end,
    current_period_start + interval '1 month',
    now() + interval '1 month'
  )
where current_credit_period_start is null
   or current_credit_period_end is null
   or mum_ia_quota_monthly is null
   or mum_ia_used_current_period is null;
