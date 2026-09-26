# Axon: Data Model (target state, all planned features)

This file is the source of truth for the database design. Each feature doc copies the SQL for its own migration from here. When a migration lands, mark its table ✅ in the registry in `.claude/features/00-index.md`. If the applied SQL differs from this file, update this file.

Conventions are in `.claude/rules/supabase.md`: composite ownership FKs, the owner-only RLS policy, `updated_at` triggers and soft delete.

## Entity map

```
auth.users
 └── profiles (1:1)                      fy_start_month, week_starts_on, timezone, theme, last_space_id
 └── spaces (1:n)                        name, slug, color, icon, position, archived_at
      ├── tasks (1:n)                    status, priority, start/due date, description (tiptap), position
      │    ├── todos (1:n, checklist)    todos.task_id
      │    ├── task_activity (1:n)       auto-logged history + manual log comments
      │    ├── task_links (1:n)          MR/ticket/doc links, ordered by position
      │    ├── task_tags  ─┐
      │    └── note_task_links ──┐
      ├── todos (standalone)     │
      ├── notes (1:n) ───────────┘       kind = note | journal (journal_date)
      │    └── note_tags ─┤
      ├── tags (space-scoped, or space_id NULL = available in every space)
      ├── events (1:n)                   starts_at/ends_at, optional task_id / note_id
      └── inbox_items (space_id nullable = unsorted)
 └── reports (1:n, space_id nullable = Global report)   fiscal period + tiptap content + stats snapshot
```

## 00: Shared helpers (Feature 01/02)

```sql
create extension if not exists pg_trgm with schema extensions;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
```

## profiles (Feature 02)

```sql
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text check (char_length(full_name) <= 120),
  avatar_url      text,
  fy_start_month  smallint not null default 4 check (fy_start_month between 1 and 12),
  week_starts_on  smallint not null default 1 check (week_starts_on between 0 and 6),
  timezone        text not null default 'UTC',
  theme           text not null default 'system' check (theme in ('light','dark','system')),
  last_space_id   uuid,             -- FK added in Feature 03
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, full_name, timezone)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    coalesce(new.raw_user_meta_data ->> 'timezone', 'UTC')
  );
  return new;
end;
$$;

-- trigger-only function: not callable through the API
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

## spaces (Feature 03)

```sql
create table public.spaces (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  slug         text not null check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 48 and slug <> 'global'),
  description  text check (char_length(description) <= 280),
  color        text not null default 'slate',
  icon         text not null default '📁' check (char_length(icon) between 1 and 16),  -- an emoji (migration 20260923180401)
  position     double precision not null default 0,
  archived_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, slug),
  unique (id, user_id)
);

create index spaces_user_idx on public.spaces (user_id, position);
create trigger spaces_updated_at before update on public.spaces
  for each row execute function public.set_updated_at();

alter table public.spaces enable row level security;
create policy "spaces_owner_all" on public.spaces for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

alter table public.profiles
  add constraint profiles_last_space_fk
  foreign key (last_space_id) references public.spaces(id) on delete set null;
```

## tags (Feature 04, Phase 3)

```sql
create table public.tags (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id    uuid,                                   -- NULL = available in every space
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  color       text not null default 'slate',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create unique index tags_name_unique on public.tags
  (user_id, coalesce(space_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name));
-- + updated_at trigger, RLS owner policy
```

## tasks (Feature 04)

```sql
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id          uuid not null,
  title             text not null check (char_length(btrim(title)) between 1 and 300),
  description       jsonb,                              -- tiptap doc (edited from Feature 07)
  description_text  text not null default '',
  status            text not null default 'todo'
                    check (status in ('todo','in_progress','in_review','blocked','on_hold','done','cancelled')),
  priority          text not null default 'none'
                    check (priority in ('none','low','medium','high','urgent')),
  start_date        date,
  due_date          date,
  completed_at      timestamptz,
  versions          text[] not null default '{}'         -- free-text versions (v3.9.0), several allowed
                    check (cardinality(versions) <= 10 and char_length(array_to_string(versions, '')) <= 400),
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
create index tasks_versions_idx on public.tasks using gin (versions);

-- completed_at bookkeeping
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
-- + updated_at trigger, RLS owner policy
```

## task_links (Feature 04 follow-up)

A task can carry any number of links (MR, ticket, doc); replaces the single `tasks.external_url` column.

```sql
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
-- + updated_at trigger, RLS owner policy
```

## task_tags / note_tags (Features 04 and 06)

```sql
create table public.task_tags (
  task_id     uuid not null,
  tag_id      uuid not null,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (task_id, tag_id),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade,
  foreign key (tag_id,  user_id) references public.tags(id,  user_id) on delete cascade
);
create index task_tags_tag_idx on public.task_tags (tag_id);
-- note_tags: identical, with note_id → notes(id, user_id)
-- RLS owner policy on both
```

## todos (Feature 05)

```sql
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

-- keep done_at in sync; checklist todos inherit the task's space
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

-- tasks → todos cascade: space moves + soft delete/restore (same timestamp)
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
-- + updated_at trigger, RLS owner policy
```

## notes (Feature 06; journal columns in Feature 09)

```sql
create table public.notes (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid not null,
  title         text not null default '' check (char_length(title) <= 300),
  content       jsonb,                                  -- tiptap doc
  content_text  text not null default '',
  excerpt       text generated always as (left(content_text, 280)) stored,   -- list previews without the full text
  versions      text[] not null default '{}'             -- free-text versions (v3.9.0), like tasks (added 2026-09-25)
                check (cardinality(versions) <= 10 and char_length(array_to_string(versions, '')) <= 400),
  pinned_at     timestamptz,
  deleted_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  search        tsvector generated always as (
                  setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                  setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
                ) stored,
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index notes_scope_idx  on public.notes (user_id, space_id, updated_at desc) where deleted_at is null;
create index notes_search_idx on public.notes using gin (search);
create index notes_title_trgm on public.notes using gin (title extensions.gin_trgm_ops);
create index notes_versions_idx on public.notes using gin (versions);
-- + updated_at trigger, RLS owner policy

-- Feature 09 (journal), applied as migration 20260926071151_add_journal_to_notes:
alter table public.notes
  add column kind text not null default 'note' check (kind in ('note','journal')),
  add column journal_date date,
  add constraint notes_journal_date_chk check ((kind = 'journal') = (journal_date is not null));
create unique index notes_journal_unique on public.notes (user_id, space_id, journal_date)
  where kind = 'journal' and deleted_at is null;
```

## task_activity (Feature 07)

```sql
create table public.task_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null,
  kind        text not null check (kind in
                ('created','status','priority','due_date','title','space','note_linked','note_unlinked','comment')),
  from_value  text,
  to_value    text,
  body        text check (char_length(body) <= 5000),   -- 'comment' = manual work-log entry
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index task_activity_task_idx on public.task_activity (task_id, created_at desc);

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
-- + updated_at trigger (marks edited comments), RLS owner policy.
-- Backfill: one 'created' row per existing task (created_at = task.created_at).
```

## note_task_links (Feature 07)

```sql
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

-- Reconcile mention-sourced links for a note. Manual links are never touched.
create or replace function public.sync_note_mentions(p_note_id uuid, p_task_ids uuid[])
returns void language plpgsql security invoker set search_path = '' as $$
begin
  delete from public.note_task_links
   where note_id = p_note_id and source = 'mention' and not (task_id = any (p_task_ids));
  insert into public.note_task_links (note_id, task_id, source)
  select p_note_id, t.id, 'mention' from public.tasks t where t.id = any (p_task_ids)  -- skips purged ids
  on conflict (note_id, task_id) do nothing;
end;
$$;

-- log link changes into task_activity (to_value = note id)
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
-- + RLS owner policy
```

## events (Feature 08)

```sql
create table public.events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id     uuid not null,
  title        text not null check (char_length(btrim(title)) between 1 and 200),
  description  text check (char_length(description) <= 5000),
  location     text check (char_length(location) <= 200),
  url          text check (char_length(url) <= 2000),   -- meeting link
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  all_day      boolean not null default false,
  task_id      uuid,
  note_id      uuid,                                    -- meeting notes
  deleted_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (ends_at >= starts_at),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade,
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete set null (task_id),
  foreign key (note_id, user_id) references public.notes(id, user_id) on delete set null (note_id)
);
create index events_range_idx on public.events (user_id, starts_at, ends_at) where deleted_at is null;
create index events_space_idx on public.events (space_id);
create index events_task_idx  on public.events (task_id) where task_id is not null;
create index events_note_idx  on public.events (note_id) where note_id is not null;
create index events_title_trgm on public.events using gin (title extensions.gin_trgm_ops);
-- + updated_at trigger, RLS owner policy. Applied as migration 20260925201716_create_events.
-- All-day convention: starts_at = 00:00 on the first day, ends_at = 23:59:59.999 on the last, in profiles.timezone.
```

## reports (Feature 11)

```sql
create table public.reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id        uuid,                                 -- NULL = Global report (all spaces)
  title           text not null check (char_length(btrim(title)) between 1 and 200),
  period_kind     text not null default 'quarter' check (period_kind in ('quarter','month','custom')),
  period_start    date not null,
  period_end      date not null,
  fiscal_year     smallint,                             -- FY start year: FY 2026-27 → 2026
  fiscal_quarter  smallint check (fiscal_quarter between 1 and 4),
  content         jsonb,
  content_text    text not null default '',
  stats           jsonb not null default '{}'::jsonb,   -- snapshot from report_stats()
  stats_refreshed_at timestamptz,
  status          text not null default 'draft' check (status in ('draft','final')),
  pinned_at       timestamptz,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  search          tsvector generated always as (
                    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                    setweight(to_tsvector('english', coalesce(content_text, '')), 'B')
                  ) stored,
  check (period_end >= period_start),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index reports_period_idx on public.reports (user_id, period_start desc) where deleted_at is null;
create index reports_search_idx on public.reports using gin (search);
-- + updated_at trigger, RLS owner policy
-- Feature 12 (search_all migration) adds:
create index reports_title_trgm on public.reports using gin (title extensions.gin_trgm_ops);
```

`report_stats(p_space_ids uuid[], p_start date, p_end date) returns jsonb` is a `security invoker` function, so it only sees the caller's rows. It buckets timestamps into local days and weeks using the caller's `profiles.timezone` and `week_starts_on`, and reconstructs "at end" statuses from `task_activity`. The full SQL is in `11-reports.md` Phase 1. It returns:

```json
{
  "tasks":  { "completed": 0, "created": 0, "in_progress_at_end": 0, "blocked_at_end": 0, "overdue_at_end": 0,
              "completed_by_priority": { "urgent": 0, "high": 0, "medium": 0, "low": 0, "none": 0 },
              "completed_by_tag": [ { "tag_id": "", "name": "", "count": 0 } ],
              "completed_by_week": [ { "week_start": "2026-04-06", "count": 0 } ],
              "completed_by_space": [ { "space_id": "", "count": 0 } ] },
  "todos":  { "completed": 0 },
  "notes":  { "created": 0, "journal_entries": 0 },
  "events": { "count": 0 }
}
```

## inbox_items (Feature 13)

```sql
create table public.inbox_items (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id      uuid,                                   -- NULL = unsorted (captured from Global)
  body          text not null check (char_length(btrim(body)) between 1 and 5000),
  processed_at  timestamptz,
  processed_as  text check (processed_as in ('task','todo','note','event','discarded')),
  processed_ref uuid,                                   -- id of the created entity
  source        text not null default 'quick_capture'
                check (source in ('quick_capture','email','api')),  -- design delta 13; the kind icon is derived client-side
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  check ((processed_at is null) = (processed_as is null)),
  check (processed_ref is null or processed_as in ('task','todo','note','event')),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);
create index inbox_open_idx      on public.inbox_items (user_id, created_at desc) where processed_at is null;
create index inbox_processed_idx on public.inbox_items (user_id, processed_at desc) where processed_at is not null;
-- + updated_at trigger, RLS owner policy
```

## RPCs summary

| Function | Feature | Purpose |
|---|---|---|
| `sync_note_mentions(p_note_id, p_task_ids)` | 07 | Reconcile `[[task]]` mention links |
| `week_start_of(p_date, p_week_starts_on)` | 10 | Immutable helper: the start of the week containing `p_date`; shared by the two RPCs below |
| `dashboard_summary(p_space_ids, p_today, p_quarter_start, p_quarter_end, p_prev_start, p_prev_end)` | 10 | Open, overdue, due-today, in-progress and blocked counts; completed this and previous quarter; `completed_by_week`; `per_space`. Full SQL in `10-dashboard.md` Phase 2 |
| `report_stats(p_space_ids, p_start, p_end)` | 11 | Stats snapshot for reports |
| `search_all(p_query, p_space_ids, p_limit, p_include_global)` | 12 | Unified search across tasks, notes, todos, events and reports (`p_include_global` adds Global reports) |
| `trash_items(p_space_ids, p_include_global)` / `purge_trash(p_older_than, p_space_ids)` | 14 | Trash listing and caller purge (`p_space_ids` null = all the caller's rows) |
| `private.purge_all_trash()` | 14 | Security definer, not exposed via PostgREST; daily `pg_cron` job `axon-purge-trash` at 03:00 UTC purges rows deleted over 30 days ago |

## Storage (Feature 15)

```sql
-- Private bucket for editor images (Phase 1); file attachments and space images join it later.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 10485760,
        array['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
-- Owner-only select / insert / update / delete on storage.objects:
--   bucket_id = 'attachments' and (storage.foldername(name))[1] = (select auth.uid())::text
```

- **Paths:** `{user_id}/{space_id}/{uuid}.{ext}`. Files are only ever read through signed URLs (1 hour).
- **Docs reference images by path:** the Tiptap `image` node stores `{ path, alt, width, height }` in `notes.content` / `tasks.description`. There's no table in Phase 1; Phase 2 adds `attachments` for task files.
