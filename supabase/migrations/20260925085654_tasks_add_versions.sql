-- Feature 04 follow-up: free-text versions a task is linked to (e.g. v3.9.0); a task can have several
alter table public.tasks
  add column versions text[] not null default '{}'
  constraint tasks_versions_check
    check (cardinality(versions) <= 10 and char_length(array_to_string(versions, '')) <= 400);

create index tasks_versions_idx on public.tasks using gin (versions);
