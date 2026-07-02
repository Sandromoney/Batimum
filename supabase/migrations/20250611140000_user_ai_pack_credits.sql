alter table public.user_ai_usage
  add column if not exists ai_pack_credits integer not null default 0;

comment on column public.user_ai_usage.ai_pack_credits is
  'Crédits IA bonus achetés via packs supplémentaires.';
