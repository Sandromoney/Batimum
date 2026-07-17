-- Droits PostgreSQL pour le rôle authenticated (complément des policies RLS).
-- Sans ces GRANT, les requêtes session utilisateur échouent avec 42501 permission denied.

grant select, insert, update, delete on public.user_settings to authenticated;
grant select, insert, update, delete on public.email_connections to authenticated;
grant select, insert, update on public.user_ai_usage to authenticated;

grant all on public.user_settings to service_role;
grant all on public.email_connections to service_role;
grant all on public.user_ai_usage to service_role;
