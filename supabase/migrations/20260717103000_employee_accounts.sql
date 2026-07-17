-- Accès employés (identifiant + mot de passe haché) par entreprise
create table if not exists public.employee_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references auth.users (id) on delete cascade,
  employe_id text not null,
  employee_login text not null,
  employee_password_hash text not null,
  employee_account_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint employee_accounts_company_employe_unique unique (company_id, employe_id),
  constraint employee_accounts_company_login_unique unique (company_id, employee_login)
);

create index if not exists employee_accounts_login_lower_idx
  on public.employee_accounts (lower(employee_login));

alter table public.employee_accounts enable row level security;

grant select, insert, update, delete on public.employee_accounts to service_role;

comment on table public.employee_accounts is
  'Identifiants de connexion employés (hors Supabase Auth dirigeant).';
