-- Feature 06 follow-up: free-text versions a note is linked to (e.g. v3.9.0), like tasks.versions
alter table public.notes
  add column versions text[] not null default '{}'
  constraint notes_versions_check
    check (cardinality(versions) <= 10 and char_length(array_to_string(versions, '')) <= 400);

create index notes_versions_idx on public.notes using gin (versions);
