-- Feature 07 Phase 2: notes <-> tasks, many-to-many (manual now; mentions in Phase 3).
create table public.note_task_links (
  note_id     uuid not null,
  task_id     uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source      text not null default 'manual' check (source in ('manual','mention')),
  created_at  timestamptz not null default now(),
  primary key (note_id, task_id),
  foreign key (note_id, user_id) references public.notes(id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index note_task_links_task_idx on public.note_task_links (task_id);
alter table public.note_task_links enable row level security;
create policy "note_task_links_owner_all" on public.note_task_links for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- log link changes into task_activity (to_value / from_value = note id)
create or replace function public.note_links_log_activity()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    insert into public.task_activity (user_id, task_id, kind, to_value) values (new.user_id, new.task_id, 'note_linked', new.note_id::text);
    return new;
  else
    -- skip when the task itself is being deleted (cascade from a task or space purge)
    if exists (select 1 from public.tasks t where t.id = old.task_id) then
      insert into public.task_activity (user_id, task_id, kind, from_value) values (old.user_id, old.task_id, 'note_unlinked', old.note_id::text);
    end if;
    return old;
  end if;
end;
$$;
create trigger note_links_log_activity after insert or delete on public.note_task_links
  for each row execute function public.note_links_log_activity();
