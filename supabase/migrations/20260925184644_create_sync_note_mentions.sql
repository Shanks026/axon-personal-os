-- Feature 07 Phase 3: reconcile mention-sourced links for a note. Manual links are never touched.
create or replace function public.sync_note_mentions(p_note_id uuid, p_task_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.note_task_links
   where note_id = p_note_id and source = 'mention' and not (task_id = any (p_task_ids));
  insert into public.note_task_links (note_id, task_id, source)
  select p_note_id, t.id, 'mention' from public.tasks t where t.id = any (p_task_ids)
  on conflict (note_id, task_id) do nothing;
end;
$$;
