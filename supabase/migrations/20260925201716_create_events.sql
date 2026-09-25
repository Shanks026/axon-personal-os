create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id     uuid not null,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text check (char_length(description) <= 5000),
  location     text check (char_length(location) <= 200),
  url          text check (char_length(url) <= 2000),
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  task_id      uuid,
  note_id      uuid,
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at >= starts_at),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete set null (task_id),
  foreign key (note_id, user_id) references public.notes(id, user_id) on delete set null (note_id)
);
create index events_range_idx on public.events (user_id, starts_at, ends_at) where deleted_at is null;
create index events_space_idx on public.events (space_id);
create index events_task_idx  on public.events (task_id) where task_id is not null;
create index events_note_idx  on public.events (note_id) where note_id is not null;
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);

create trigger events_updated_at before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;
create policy "events_owner_all" on public.events for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
