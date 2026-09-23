-- Feature 03 Phase 1: spaces (see .claude/docs/data-model.md)

create table public.spaces (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  slug         text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 48 and slug <> 'global'),
  description  text check (char_length(description) <= 280),
  color        text not null default 'slate',
  icon         text not null default 'folder',
  position     double precision not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, slug),
  unique (id, user_id)
);

create index spaces_user_idx on public.spaces (user_id, position);
create trigger spaces_updated_at before update on public.spaces
  for each row execute function public.set_updated_at();

alter table public.spaces enable row level security;
create policy "spaces_owner_all" on public.spaces for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.profiles
  add constraint profiles_last_space_fk
  foreign key (last_space_id) references public.spaces(id) on delete set null;
