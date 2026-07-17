-- Droits requis pour le client service_role (API serveur Next.js).
grant select, insert, update, delete on public.employee_accounts to service_role;

-- Recharge le cache PostgREST après création / migration.
notify pgrst, 'reload schema';
