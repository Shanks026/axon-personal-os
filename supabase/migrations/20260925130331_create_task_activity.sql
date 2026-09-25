-- Feature 07 Phase 1: automatic task history plus manual work-log comments.
create table public.task_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null,
  kind        text not null check (kind in
                ('created','status','priority','due_date','title','space','note_linked','note_unlinked','comment')),
  from_value  text,
  to_value    text,
  body        text check (char_length(body) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index task_activity_task_idx on public.task_activity (task_id, created_at desc);
create trigger task_activity_updated_at before update on public.task_activity
  for each row execute function public.set_updated_at();
alter table public.task_activity enable row level security;
create policy "task_activity_owner_all" on public.task_activity for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.tasks_log_activity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (user_id, task_id, kind, to_value) values (new.user_id, new.id, 'created', new.status);
    return new;
  end if;
  if new.status   is distinct from old.status   then insert into public.task_activity (user_id, task_id, kind, from_value, to_value) values (new.user_id, new.id, 'status',   old.status,   new.status); end if;
  if new.priority is distinct from old.priority then insert into public.task_activity (user_id, task_id, kind, from_value, to_value) values (new.user_id, new.id, 'priority', old.priority, new.priority); end if;
  if new.due_date is distinct from old.due_date then insert into public.task_activity (user_id, task_id, kind, from_value, to_value) values (new.user_id, new.id, 'due_date', old.due_date::text, new.due_date::text); end if;
  if new.title    is distinct from old.title    then insert into public.task_activity (user_id, task_id, kind, from_value, to_value) values (new.user_id, new.id, 'title',    old.title,    new.title); end if;
  if new.space_id is distinct from old.space_id then insert into public.task_activity (user_id, task_id, kind, from_value, to_value) values (new.user_id, new.id, 'space',    old.space_id::text, new.space_id::text); end if;
  return new;
end;
$$;
create trigger tasks_log_activity after insert or update on public.tasks
  for each row execute function public.tasks_log_activity();

-- backfill: one 'created' row per existing task
insert into public.task_activity (user_id, task_id, kind, to_value, created_at, updated_at)
select t.user_id, t.id, 'created', t.status, t.created_at, t.created_at from public.tasks t;
