-- Feature 04 follow-up: multiple links per task (replaces the single tasks.external_url)
create table public.task_links (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null,
  url         text not null check (char_length(btrim(url)) between 1 and 2000),
  label       text,
  position    double precision not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index task_links_task_idx on public.task_links (task_id, position);

create trigger task_links_updated_at before update on public.task_links
  for each row execute function public.set_updated_at();

alter table public.task_links enable row level security;
create policy "task_links_owner_all" on public.task_links for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Migrate the single external_url onto each task into its first link, then drop the column.
insert into public.task_links (user_id, task_id, url, position)
select user_id, id, external_url, 1000
from public.tasks
where external_url is not null and btrim(external_url) <> '';

alter table public.tasks drop column external_url;
