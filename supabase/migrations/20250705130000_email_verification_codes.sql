-- Codes de vérification email à l'inscription (accès service_role uniquement).

create table if not exists public.email_verification_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  email text not null,
  code_hash text not null,
  code_salt text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  used_at timestamptz,
  last_sent_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists email_verification_codes_email_idx
  on public.email_verification_codes (email);

create index if not exists email_verification_codes_email_active_idx
  on public.email_verification_codes (email, used_at, expires_at);

alter table public.email_verification_codes enable row level security;

grant all on public.email_verification_codes to service_role;
