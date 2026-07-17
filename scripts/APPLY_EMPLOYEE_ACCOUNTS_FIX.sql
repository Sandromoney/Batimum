-- SQL MINIMAL — exécuter dans Supabase SQL Editor (1 fois)
-- Projet : leelogrqsqjymlamgecg

grant select, insert, update, delete on public.employee_accounts to service_role;
grant select, insert, update, delete on public.employee_accounts to authenticated;
grant select on public.user_settings to service_role;

alter table public.employee_accounts enable row level security;

drop policy if exists employee_accounts_company_policy on public.employee_accounts;
create policy employee_accounts_company_policy on public.employee_accounts
  for all to authenticated
  using (company_id = auth.uid())
  with check (company_id = auth.uid());

create or replace function public.employee_account_find_by_login(p_login text)
returns setof public.employee_accounts
language sql security definer set search_path = public stable
as $$ select * from public.employee_accounts where lower(trim(employee_login)) = lower(trim(p_login)); $$;

create or replace function public.employee_account_get(p_company_id uuid, p_employe_id text)
returns public.employee_accounts
language sql security definer set search_path = public stable
as $$ select * from public.employee_accounts where company_id = p_company_id and employe_id = p_employe_id limit 1; $$;

create or replace function public.employee_account_upsert(
  p_company_id uuid, p_employe_id text, p_login text, p_password_hash text, p_active boolean
) returns void language plpgsql security definer set search_path = public as $$
declare v_login text := lower(trim(p_login));
begin
  insert into public.employee_accounts (company_id, employe_id, employee_login, employee_password_hash, employee_account_active, updated_at)
  values (p_company_id, p_employe_id, v_login, p_password_hash, coalesce(p_active, true), now())
  on conflict (company_id, employe_id) do update set
    employee_login = excluded.employee_login,
    employee_password_hash = excluded.employee_password_hash,
    employee_account_active = excluded.employee_account_active,
    updated_at = now();
end; $$;

create or replace function public.employee_account_delete(p_company_id uuid, p_employe_id text)
returns void language sql security definer set search_path = public
as $$ delete from public.employee_accounts where company_id = p_company_id and employe_id = p_employe_id; $$;

create or replace function public.employee_account_set_active(p_company_id uuid, p_employe_id text, p_active boolean)
returns void language sql security definer set search_path = public
as $$ update public.employee_accounts set employee_account_active = coalesce(p_active, true), updated_at = now()
     where company_id = p_company_id and employe_id = p_employe_id; $$;

create or replace function public.employee_account_login_taken(
  p_login text, p_exclude_company_id uuid default null, p_exclude_employe_id text default null
) returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.employee_accounts
    where lower(trim(employee_login)) = lower(trim(p_login))
      and not (p_exclude_company_id is not null and p_exclude_employe_id is not null
               and company_id = p_exclude_company_id and employe_id = p_exclude_employe_id)
  ); $$;

grant execute on function public.employee_account_find_by_login(text) to service_role;
grant execute on function public.employee_account_get(uuid, text) to service_role;
grant execute on function public.employee_account_upsert(uuid, text, text, text, boolean) to service_role;
grant execute on function public.employee_account_delete(uuid, text) to service_role;
grant execute on function public.employee_account_set_active(uuid, text, boolean) to service_role;
grant execute on function public.employee_account_login_taken(text, uuid, text) to service_role;

notify pgrst, 'reload schema';
