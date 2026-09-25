create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid not null,
  title         text not null default '' check (char_length(title) <= 300),
  content       jsonb,
  content_text  text not null default '',
  excerpt       text generated always as (left(content_text, 280)) stored,
  pinned_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
                ) stored,
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index notes_scope_idx  on public.notes (user_id, space_id, updated_at desc) where deleted_at is null;
create index notes_search_idx on public.notes using gin (search);
create index notes_title_trgm on public.notes using gin (title extensions.gin_trgm_ops);
create trigger notes_updated_at before update on public.notes
  for each row execute function public.set_updated_at();
alter table public.notes enable row level security;
create policy "notes_owner_all" on public.notes for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.note_tags (
  note_id     uuid not null,
  tag_id      uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (note_id, tag_id),
  foreign key (note_id, user_id) references public.notes(id, user_id) on delete cascade,
  foreign key (tag_id,  user_id) references public.tags(id,  user_id) on delete cascade
);
create index note_tags_tag_idx on public.note_tags (tag_id);
alter table public.note_tags enable row level security;
create policy "note_tags_owner_all" on public.note_tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
