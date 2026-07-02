-- Quota MUM IA mensuel par compte entreprise (user_id = propriétaire du compte)
alter table public.user_ai_usage
  add column if not exists quota_mum_ia_mensuel integer not null default 100,
  add column if not exists mum_ia_utilises_mois integer not null default 0,
  add column if not exists mois_quota_actuel text;

comment on column public.user_ai_usage.quota_mum_ia_mensuel is
  'Nombre de devis MUM IA inclus par mois calendaire (abonnement entreprise).';
comment on column public.user_ai_usage.mum_ia_utilises_mois is
  'Devis MUM IA générés avec succès durant le mois_quota_actuel.';
comment on column public.user_ai_usage.mois_quota_actuel is
  'Mois calendaire du quota actif (format YYYY-MM, fuseau Europe/Paris).';

update public.user_ai_usage
set
  quota_mum_ia_mensuel = coalesce(nullif(ai_requests_limit, 0), 100),
  mum_ia_utilises_mois = coalesce(ai_requests_used, 0),
  mois_quota_actuel = coalesce(
    mois_quota_actuel,
    to_char(timezone('Europe/Paris', coalesce(current_period_start, now())), 'YYYY-MM')
  )
where mois_quota_actuel is null or mois_quota_actuel = '';
