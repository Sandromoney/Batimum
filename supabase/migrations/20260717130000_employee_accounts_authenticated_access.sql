-- Accès dirigeant (session authenticated) aux comptes employés de son entreprise.
-- Idempotent : safe à ré-exécuter sur Supabase déjà partiellement configuré.

grant select, insert, update, delete on public.employee_accounts to authenticated;

drop policy if exists employee_accounts_company_policy on public.employee_accounts;
create policy employee_accounts_company_policy on public.employee_accounts
  for all to authenticated
  using (company_id = auth.uid())
  with check (company_id = auth.uid());

-- service_role : accès complet (API login employé, tests, bootstrap admin)
grant select, insert, update, delete on public.employee_accounts to service_role;
grant select, insert, update, delete on public.user_settings to service_role;

-- RPC exposées au client serveur (service_role) et au dirigeant authentifié
grant execute on function public.employee_account_find_by_login(text) to service_role, authenticated;
grant execute on function public.employee_account_get(uuid, text) to service_role, authenticated;
grant execute on function public.employee_account_upsert(uuid, text, text, text, boolean) to service_role, authenticated;
grant execute on function public.employee_account_delete(uuid, text) to service_role, authenticated;
grant execute on function public.employee_account_set_active(uuid, text, boolean) to service_role, authenticated;
grant execute on function public.employee_account_login_taken(text, uuid, text) to service_role, authenticated;

notify pgrst, 'reload schema';
