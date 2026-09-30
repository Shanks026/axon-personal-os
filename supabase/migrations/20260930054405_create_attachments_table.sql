create table public.attachments (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id           uuid not null,
  task_id            uuid not null,
  path               text unique,
  name               text not null check (char_length(btrim(name)) between 1 and 255),
  mime               text not null default 'application/octet-stream' check (char_length(mime) <= 150),
  size               bigint not null default 0 check (size >= 0),
  width              integer check (width > 0),
  height             integer check (height > 0),
  source             text not null default 'upload' check (source in ('upload','jira')),
  jira_attachment_id text check (jira_attachment_id ~ '^[0-9]+$'),
  external_url       text check (external_url ~* '^https://'),
  created_at         timestamptz not null default now(),
  check (path is not null or external_url is not null),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index attachments_task_idx on public.attachments (task_id, created_at);
create index attachments_space_idx on public.attachments (space_id);
create index attachments_user_idx on public.attachments (user_id);
create unique index attachments_jira_unique on public.attachments (task_id, jira_attachment_id)
  where jira_attachment_id is not null;
alter table public.attachments enable row level security;
create policy "attachments_owner_all" on public.attachments for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

update storage.buckets set file_size_limit = 52428800, allowed_mime_types = null
  where id = 'attachments';
