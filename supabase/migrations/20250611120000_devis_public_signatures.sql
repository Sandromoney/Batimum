-- Liens publics de signature devis (accessibles sans session, via public_token)
create table if not exists public.devis_public_signatures (
  id uuid primary key default gen_random_uuid(),
  public_token text not null unique,
  user_id uuid not null references auth.users (id) on delete cascade,
  devis_id text not null,
  devis jsonb not null,
  client jsonb,
  parametres jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'signed', 'refused', 'expired')),
  signature_data text,
  signed_by text,
  signed_at timestamptz,
  refused_at timestamptz,
  refused_by text,
  refusal_reason text,
  client_ip text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, devis_id)
);

create index if not exists devis_public_signatures_token_idx
  on public.devis_public_signatures (public_token);

create index if not exists devis_public_signatures_user_devis_idx
  on public.devis_public_signatures (user_id, devis_id);

alter table public.devis_public_signatures enable row level security;

drop policy if exists "Owners read own public devis signatures" on public.devis_public_signatures;
create policy "Owners read own public devis signatures"
  on public.devis_public_signatures
  for select
  using (auth.uid() = user_id);

drop policy if exists "Owners insert own public devis signatures" on public.devis_public_signatures;
create policy "Owners insert own public devis signatures"
  on public.devis_public_signatures
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Owners update own public devis signatures" on public.devis_public_signatures;
create policy "Owners update own public devis signatures"
  on public.devis_public_signatures
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Lecture publique par token : uniquement via API service_role (le token fait foi).
