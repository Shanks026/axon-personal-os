create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id        uuid,
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  period_kind     text not null default 'quarter' check (period_kind in ('quarter','month','week','custom')),
  period_start    date not null,
  period_end      date not null,
  fiscal_year     smallint,
  fiscal_quarter  smallint check (fiscal_quarter between 1 and 4),
  content         jsonb,
  content_text    text not null default '',
  stats           jsonb not null default '{}'::jsonb,
  stats_refreshed_at timestamptz,
  status          text not null default 'draft' check (status in ('draft','final')),
  ai_model        text check (char_length(ai_model) <= 80),
  generated_at    timestamptz,
  pinned_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
                  ) stored,
  check (period_end >= period_start),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index reports_period_idx on public.reports (user_id, period_start desc) where deleted_at is null;
create index reports_space_idx on public.reports (space_id);
create index reports_search_idx on public.reports using gin (search);
create trigger reports_updated_at before update on public.reports
  for each row execute function public.set_updated_at();
alter table public.reports enable row level security;
create policy "reports_owner_all" on public.reports for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
