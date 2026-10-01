create table public.inbox_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid,
  body          text not null check (char_length(btrim(body)) between 1 and 5000),
  source        text not null default 'quick_capture' check (source in ('quick_capture','email','api')),
  processed_at  timestamptz,
  processed_as  text check (processed_as in ('task','todo','note','event','discarded')),
  processed_ref uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((processed_at is null) = (processed_as is null)),
  check (processed_ref is null or processed_as in ('task','todo','note','event')),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);

create index inbox_open_idx      on public.inbox_items (user_id, created_at desc) where processed_at is null;
create index inbox_processed_idx on public.inbox_items (user_id, processed_at desc) where processed_at is not null;
create index inbox_space_idx     on public.inbox_items (space_id);

create trigger inbox_items_updated_at before update on public.inbox_items
  for each row execute function public.set_updated_at();

alter table public.inbox_items enable row level security;

create policy "inbox_items_owner_all" on public.inbox_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
