-- Feature 04 Phase 3: tags + task_tags (see .claude/docs/data-model.md)

create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id    uuid,                                   -- NULL = available in every space
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  color       text not null default 'slate',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create unique index tags_name_unique on public.tags
  (user_id, coalesce(space_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
create trigger tags_updated_at before update on public.tags
  for each row execute function public.set_updated_at();
alter table public.tags enable row level security;
create policy "tags_owner_all" on public.tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table public.task_tags (
  task_id     uuid not null,
  tag_id      uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, tag_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  foreign key (tag_id,  user_id) references public.tags(id,  user_id) on delete cascade
);
create index task_tags_tag_idx on public.task_tags (tag_id);
alter table public.task_tags enable row level security;
create policy "task_tags_owner_all" on public.task_tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
