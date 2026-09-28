alter table public.tasks
  add column jira_key         text check (jira_key ~ '^[A-Z][A-Z0-9_]*-[0-9]+$'),
  add column jira_imported_at timestamptz;
create unique index tasks_jira_key_unique on public.tasks (user_id, jira_key)
  where jira_key is not null and deleted_at is null;

alter table public.profiles
  add column jira_settings jsonb not null default '{}'::jsonb
    check (jsonb_typeof(jira_settings) = 'object');
