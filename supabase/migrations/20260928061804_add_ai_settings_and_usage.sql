alter table public.profiles
  add column ai_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(ai_settings) = 'object');

create table public.ai_usage (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  job               text not null check (job in ('draft_tasks','checklist','report_weekly','report_quarterly','chat')),
  model             text not null check (char_length(model) <= 80),
  input_tokens      integer not null default 0 check (input_tokens >= 0),
  output_tokens     integer not null default 0 check (output_tokens >= 0),
  cache_read_tokens integer not null default 0 check (cache_read_tokens >= 0),
  cost_usd          numeric(10,6) not null default 0 check (cost_usd >= 0),
  created_at        timestamptz not null default now()
);
create index ai_usage_user_month_idx on public.ai_usage (user_id, created_at desc);
alter table public.ai_usage enable row level security;
create policy "ai_usage_owner_all" on public.ai_usage
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
