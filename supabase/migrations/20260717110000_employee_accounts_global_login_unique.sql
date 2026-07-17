-- Identifiant employé unique dans toute la plateforme (insensible casse / espaces via normalisation applicative).
-- AVANT d'appliquer : vérifier les doublons avec :
--   select lower(trim(employee_login)) as login_norm, count(*) as nb
--   from public.employee_accounts
--   group by 1
--   having count(*) > 1;
-- Ne pas supprimer de données automatiquement si des doublons existent.

alter table public.employee_accounts
  drop constraint if exists employee_accounts_company_login_unique;

drop index if exists public.employee_accounts_login_lower_idx;

create unique index if not exists employee_accounts_login_global_unique
  on public.employee_accounts (lower(trim(employee_login)));
