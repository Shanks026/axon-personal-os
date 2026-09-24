-- Feature 05 Phase 1: todos (see .claude/docs/data-model.md)

create table public.todos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id    uuid not null,
  task_id     uuid,                                     -- set = checklist item of that task
  title       text not null check (char_length(btrim(title)) between 1 and 500),
  is_done     boolean not null default false,
  done_at     timestamptz,
  due_date    date,
  position    double precision not null default 0,
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade,
  foreign key (task_id,  user_id) references public.tasks(id,  user_id) on delete cascade
);
create index todos_scope_idx on public.todos (user_id, space_id, is_done) where deleted_at is null;
create index todos_task_idx  on public.todos (task_id) where task_id is not null;
create index todos_title_trgm on public.todos using gin (title extensions.gin_trgm_ops);

create or replace function public.todos_before_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.is_done and (tg_op = 'INSERT' or not old.is_done) then new.done_at = now();
  elsif not new.is_done then new.done_at = null;
  end if;
  if new.task_id is not null then
    select t.space_id into new.space_id from public.tasks t where t.id = new.task_id;
  end if;
  return new;
end;
$$;
create trigger todos_before_write before insert or update on public.todos
  for each row execute function public.todos_before_write();

create or replace function public.tasks_cascade_to_todos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.space_id is distinct from old.space_id then
    update public.todos set space_id = new.space_id where task_id = new.id;
  end if;
  if new.deleted_at is not null and old.deleted_at is null then
    update public.todos set deleted_at = new.deleted_at where task_id = new.id and deleted_at is null;
  elsif new.deleted_at is null and old.deleted_at is not null then
    update public.todos set deleted_at = null where task_id = new.id and deleted_at = old.deleted_at;
  end if;
  return new;
end;
$$;
create trigger tasks_cascade_to_todos after update of space_id, deleted_at on public.tasks
  for each row execute function public.tasks_cascade_to_todos();

create trigger todos_updated_at before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.todos enable row level security;
create policy "todos_owner_all" on public.todos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
