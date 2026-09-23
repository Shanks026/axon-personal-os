---
paths:
  - "supabase/**"
  - "src/features/**/api.js"
  - "src/lib/supabase.js"
---

# Supabase Rules

The full schema is in `.claude/docs/data-model.md`. Keep it in sync with every migration.

## Migrations

1. Write the SQL.
2. Apply it with the Supabase MCP `apply_migration`, using a snake_case name such as `create_tasks`.
3. Mirror it to `supabase/migrations/<yyyyMMddHHmmss>_<name>.sql` with **identical** SQL.
4. Run `get_advisors` with type `security`, and fix every warning the migration introduced.
5. Update `.claude/docs/data-model.md` and the DB registry in `.claude/features/00-index.md`.

Never edit a migration that has already been applied. Write a new one.

**If the MCP tools aren't loaded** (for example, the server was added mid-session), use the Supabase Management API with the same access token, which is the API the MCP wraps:
- `POST /v1/projects/{ref}/database/migrations` with `{ name, query }` (records history like `apply_migration`)
- `POST /database/query` with `{ query }`
- `GET /advisors/security`

The token lives in the local Claude config. Never print it, pass it on a command line that gets echoed, or commit it. Name the mirror file after the server-assigned version from `supabase_migrations.schema_migrations`.

**Test data:** verify triggers and RLS inside a transaction that is rolled back. If a test row does get committed, delete it straight away and say so.

## Table template

```sql
create table public.<things> (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id    uuid not null,
  -- domain columns ...
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (space_id, user_id) references public.spaces(id, user_id) on delete cascade
);

create index <things>_scope_idx on public.<things> (user_id, space_id) where deleted_at is null;

create trigger <things>_updated_at before update on public.<things>
  for each row execute function public.set_updated_at();

alter table public.<things> enable row level security;

create policy "<things>_owner_all" on public.<things>
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
```

## Rules

- **RLS on every table.** One `for all` owner policy per table, written as `(select auth.uid())` (the subselect is cached per statement).
  - Never add a policy using `true` or `auth.uid() is not null`. Permissive policies are ORed together, so the broadest one wins.
- **Ownership FKs.** Every reference to another user-owned row is a composite FK: `(x_id, user_id) → x(id, user_id)`. This makes it impossible to attach your row to someone else's space, task or note, even though RLS is bypassed during FK checks.
  - For nullable references that should clear on delete, use `on delete set null (x_id)` (Postgres 15+ column list), so `user_id` isn't nulled too.
- **Client never sends `user_id`.** It defaults to `auth.uid()`.
- **Soft delete.** `deleted_at timestamptz` on tasks, todos, notes, events and reports.
  - Queries filter `deleted_at is null`.
  - Cascading soft deletes (a task's checklist todos) are done by trigger, stamping the **same** `deleted_at` value so a restore can reverse exactly that set.
- **Enums are `text` with `check` constraints**, not Postgres enum types, which are easier to evolve. Mirror the values in `features/<f>/constants.js`.
- **Ordering** uses `position double precision` with fractional indexing (`lib/position.js`). Rebalance a list when a gap falls below `1e-9`.
- **Dates.** Task and todo due dates are `date`, because they have no time zone. Events use `timestamptz`. The client converts with `lib/dates.js`.
- **Search.** Use `tsvector` generated columns (`english`) with GIN indexes on long text, and a `pg_trgm` GIN index on titles.
- **Functions and RPCs:**
  - Default to `security invoker`, so RLS applies.
  - `security definer` only when unavoidable (the auth trigger), always with `set search_path = ''` and fully qualified names.
  - Every function sets `search_path`.
  - RPCs are called only from `api.js` via `supabase.rpc('name', { p_arg })`, and parameters are prefixed `p_`.
- **Rich text** is stored as Tiptap JSON in `jsonb`, plus a derived plain-text column (`*_text`) written by the client on save for search and previews.
- **No service-role key** in the frontend, ever. Admin-only work goes in Edge Functions (a later phase).
- **Auth settings** (site URL, redirect URLs, email templates, SMTP) are dashboard-only. Record any change you ask the user to make in the changelog.
