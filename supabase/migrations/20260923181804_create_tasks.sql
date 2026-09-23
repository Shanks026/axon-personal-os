-- Feature 04 Phase 1: tasks (see .claude/docs/data-model.md)

create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id          uuid not null,
  title             text not null check (char_length(btrim(title)) between 1 and 300),
  description       jsonb,
  description_text  text not null default '',
  status            text not null default 'todo'
                    check (status in ('todo','in_progress','in_review','blocked','done','cancelled')),
  priority          text not null default 'none'
                    check (priority in ('none','low','medium','high','urgent')),
  start_date        date,
  due_date          date,
  completed_at      timestamptz,
  external_url      text,
  position          double precision not null default 0,
  pinned_at         timestamptz,
  deleted_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  search            tsvector generated always as (
                      setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(description_text, '')), 'B')
                    ) stored,
  check (start_date is null or due_date is null or start_date <= due_date),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);

create index tasks_scope_idx  on public.tasks (user_id, space_id, status) where deleted_at is null;
create index tasks_due_idx    on public.tasks (user_id, due_date) where deleted_at is null and due_date is not null;
create index tasks_done_idx   on public.tasks (user_id, completed_at) where completed_at is not null;
create index tasks_search_idx on public.tasks using gin (search);
create index tasks_title_trgm on public.tasks using gin (title extensions.gin_trgm_ops);

create or replace function public.tasks_set_completed_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'done' and (tg_op = 'INSERT' or old.status is distinct from 'done') then
    new.completed_at = now();
  elsif new.status <> 'done' then
    new.completed_at = null;
  end if;
  return new;
end;
$$;
create trigger tasks_completed_at before insert or update of status on public.tasks
  for each row execute function public.tasks_set_completed_at();

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
create policy "tasks_owner_all" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
