# Feature 14: Pins and Trash

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/14-pins-and-trash.md`
**Status**: 🔵 Planned
**Depends on**: 13
**Last Updated**: September 2026

---

## Context

Two loose ends from earlier features close here. **Pins**: `pinned_at` has existed on tasks, notes and reports since their migrations, but nothing sets it. The user wants the handful of things they return to every day (the current sprint task, the THMP conventions note, this quarter's report draft) one click away in the sidebar. **Trash**: every soft delete since Feature 04 promised "moved to Trash" with Undo, but there is no page to recover an item after the toast is gone, and deleted rows accumulate forever. This feature adds a Trash page with restore and permanent delete, plus a nightly `pg_cron` purge of anything older than 30 days. Reads that span features go through small shared `api.js` modules (`features/pins`, `features/trash`). Writes reuse each feature's own update, restore and delete functions.

---

## Phase Overview

```
Phase 1: Pins
  PinToggle (optimistic) wired into tasks, notes, journal and reports; features/pins read API; pinned-first notes list;
  NavPinned sidebar section (10 items, current scope, unpin on hover).

Phase 2: Trash
  trash_items() and purge_trash() RPCs, private.purge_all_trash() on a daily pg_cron job, features/trash api,
  TrashPage grouped by type with Restore, Delete forever and Empty trash.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Pins

### Goal
Any task, note, journal entry or report can be pinned from its row menu or its detail header. Pinned items appear in the sidebar's **Pinned** section (up to 10, newest pin first, current scope), each with its type icon, and can be unpinned on hover. The notes list shows pinned notes first under a "Pinned" subheading. Pinning feels instant (optimistic) everywhere.

### Before Starting: Confirm With Codebase
1. Features 04, 06, 09, 11 and 13 are complete. Use MCP `list_tables` (or `execute_sql` on `information_schema.columns`) to confirm `pinned_at timestamptz` exists on `tasks`, `notes` and `reports`. If any is missing, add migration `add_pinned_at` (below) and update `data-model.md`.
2. Confirm the exported plain functions `updateTask(id, patch)`, `updateNote(id, patch)` and `updateReport(id, patch)`, and each feature's key factory (`taskKeys`, `noteKeys`, `reportKeys`), including whether journal entries use `noteKeys` or a separate `journalKeys`.
3. Confirm each list's select string includes `pinned_at` (`LIST_COLUMNS` in tasks, notes and reports). Add it where missing.
4. `NavPinned.jsx` (placeholder from 03), `EntityIcon` and `lib/entityPaths.js` (12) exist.
5. Locate the menus and headers to extend: `TaskRow` menu (04), task detail meta rail (07), `NoteCard` menu and note editor header (06), journal entry header (09), report page header (11).

### 1.1 Database
No database changes expected. Only if check 1 finds a gap, migration `add_pinned_at`:

```sql
alter table public.tasks   add column if not exists pinned_at timestamptz;
alter table public.notes   add column if not exists pinned_at timestamptz;
alter table public.reports add column if not exists pinned_at timestamptz;
```

No index: pinned rows are few, and `usePinnedItems` filters by `user_id` and `space_id` through the existing scope indexes.

### 1.2 API Layer

**`src/features/pins/api.js`** (reads and the toggle; the writes themselves call each feature's `updateX`)

| Export | Details |
|---|---|
| `pinKeys` | `{ all: ['pins'], lists: () => ['pins','list'], list: (params) => ['pins','list',params] }`; params `{ spaceIds, includeGlobal }` |
| `fetchPinnedItems({ spaceIds, includeGlobal, limit = 10 })` | Three selects in `Promise.all`, each `.not('pinned_at','is',null).is('deleted_at',null).order('pinned_at',{ ascending: false }).limit(limit)`: tasks `id, space_id, title, status, pinned_at` `.in('space_id', spaceIds)`; notes `id, space_id, title, kind, journal_date, pinned_at` `.in('space_id', spaceIds)`; reports `id, space_id, title, status, pinned_at` with `.in(...)` or, when `includeGlobal`, `.or(\`space_id.in.(${ids}),space_id.is.null\`)`. Each result is mapped to `{ entity_type, id, space_id, title, status, pinned_at }` (notes → `note`/`journal`, `status` = `journal_date` for journal so `entityPath` works), merged, sorted by `pinned_at` desc and sliced to `limit`. |
| `usePinnedItems(params)` | `enabled: params.spaceIds?.length > 0` |
| `useTogglePin()` | `mutationFn: ({ entityType, id, pinned }) => UPDATERS[entityType](id, { pinned_at: pinned ? new Date().toISOString() : null })`, where `UPDATERS = { task: updateTask, note: updateNote, journal: updateNote, report: updateReport }` imported from those features' `api.js`. **Optimistic** (§3): patches `pinned_at` in `pinKeys.lists()` (removing on unpin; on pin it adds a stub `{ entity_type, id, space_id, title, status, pinned_at }` passed in the variables) and in the owning feature's `lists()` caches. `onSettled` invalidates `pinKeys.all` and the owning feature's root key. Error toast "Could not update pin". |

Scope, from `features/pins/hooks/usePinScope.js`: inside a space `{ spaceIds: [space.id], includeGlobal: false }`; in Global `{ spaceIds: activeSpaces ids, includeGlobal: true }`.

Every soft-delete hook for tasks, notes and reports adds `pinKeys.all` to its invalidation, so a trashed pinned item leaves the sidebar immediately.

### 1.3 Components

```
src/features/pins/
├── api.js
├── hooks/usePinScope.js
└── components/
    ├── PinToggle.jsx               # icon button (Pin / PinOff), aria-pressed
    └── PinMenuItem.jsx             # DropdownMenuItem "Pin" / "Unpin" for row menus
src/components/layout/
└── NavPinned.jsx                   # replaces the Feature 03 placeholder
```

- **`PinToggle`** `({ entity, entityType, size = 'icon' })`: `entity` is the row (`id`, `space_id`, `title`, `status`/`journal_date`, `pinned_at`). It renders a ghost icon button; `aria-label` is "Pin" or "Unpin", with a Tooltip. `aria-pressed={!!entity.pinned_at}`. The icon swaps with a `scaleIn` preset. It calls `useTogglePin().mutate`.
- **`PinMenuItem`** `({ entity, entityType })`: the same behaviour as a `DropdownMenuItem` with a `Pin` icon.
- **`NavPinned`**:
  - A `SidebarGroup` labelled "Pinned", rendered only when there are items (no empty placeholder in the sidebar).
  - Each `SidebarMenuItem` links to `entityPath(item, slugFor)`, with `EntityIcon`, the title (journal falls back to `formatDate(journal_date)`, an untitled note to "Untitled"), and a `SpaceBadge` dot in Global (Global reports show no badge).
  - On hover or focus a `SidebarMenuAction` "Unpin" (`PinOff`, `aria-label="Unpin <title>"`) appears.
  - Loading: two `SidebarMenuSkeleton` rows. Error: hidden, with a console warning (the sidebar must never show an error block).
  - Collapsed sidebar: icons with tooltips.
  - Motion: items use `listItem` with `AnimatePresence initial={false}` and `layout`, so pin and unpin animate. Order is `pinned_at` desc; there is no drag reorder.

### 1.4 Routes and Integration
- `AppSidebar.jsx`: render `NavPinned` between `NavMain` and `NavFooter` (replaces the placeholder).
- Tasks (04): `PinMenuItem` in the `TaskRow` actions menu and the board card menu. Task detail (07): `PinToggle` in the meta rail header.
- Notes (06): `PinMenuItem` in the `NoteCard` menu; `PinToggle` in the note editor header. `fetchNotes` orders by `pinned_at desc nulls last`, then its existing order. `NotesList` / the notes grid splits pinned notes under a "Pinned" subheading when any exist and the list isn't filtered by search.
- Journal (09): `PinToggle` in the entry header (`entityType="journal"`).
- Reports (11): `PinToggle` in the report page header, and `PinMenuItem` in the reports list row menu.
- No new routes.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 03 NavPinned | Placeholder replaced | Implement |
| 04 tasks | Pin menu item; soft delete clears pins from the sidebar | Add `PinMenuItem`; add `pinKeys.all` to delete and restore invalidation |
| 06 notes | Pinned-first ordering, pin UI | Change `fetchNotes` order, add subheading, menu item, header toggle |
| 07 task detail | Pin in meta rail | Add `PinToggle` |
| 09 journal | Pin in entry header | Add `PinToggle` |
| 11 reports | Pin in header and list | Add `PinToggle` / `PinMenuItem` |

### 1.6 Not in This Phase
- Pinning todos or events (they have no `pinned_at`; add a column later if wanted): backlog
- Manual reordering of pins: by decision, pins are ordered by `pinned_at`
- A dedicated "All pinned" page: backlog
- Trash (Phase 2)

### 1.7 Checklist: Before Marking Complete
- [ ] `pinned_at` confirmed on tasks, notes and reports (or `add_pinned_at` applied, mirrored and advisors clean)
- [ ] Pinning from a task row, task detail, note card, note editor, journal entry and report updates the icon instantly and adds the item at the top of the sidebar section
- [ ] Unpinning from the sidebar hover action removes it with an animation and updates the source view's icon
- [ ] A failed pin request rolls back the icon and the sidebar and shows an error toast
- [ ] The sidebar shows at most 10 items for the current scope; Global includes Global reports and shows space badges
- [ ] Soft-deleting a pinned task or note removes it from the sidebar at once
- [ ] The notes list shows pinned notes first under "Pinned"
- [ ] The Pinned group is hidden when nothing is pinned, and never shows an error block
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated (new shared: `PinToggle`, `PinMenuItem`; `NavPinned` implemented); `axon-data-patterns.md` §10 too

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Trash

### Goal
`/s/:slug/trash` lists everything soft-deleted in scope, grouped by type (Tasks, Todos, Notes, Journal, Events, Reports), with "Deleted 3 days ago · purges in 27 days". Each item can be restored (it animates out and reappears in its feature) or deleted forever after a confirm. "Empty trash" permanently removes everything shown. A banner explains that items are deleted after 30 days, and a nightly job enforces it. Restoring into an archived space warns and offers to unarchive it.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. MCP `list_extensions`: check whether `pg_cron` is available and installed. If it isn't installed, the migration below installs it. If it isn't available on the plan, stop and offer: (a) the user enables it in the dashboard (Database → Extensions), (b) purge-on-visit only (`purge_trash()` called when the Trash page loads), (c) a scheduled Edge Function later. Recommend (a).
3. Check the current Supabase docs for enabling `pg_cron` (the extension creates schema `cron`) and the `cron.schedule(job_name, schedule, command)` signature.
4. Confirm each feature exports `restoreX(id)` and its key factory: tasks, todos, notes (journal shares notes), events, reports. Confirm how journal restore behaves against `notes_journal_unique` (see 2.2).
5. Confirm `useUpdateSpace` (03) can unarchive (`archived_at: null`).

### 2.1 Database
Migration `create_trash_functions`:

```sql
-- Listing (caller's rows only)
create or replace function public.trash_items(
  p_space_ids      uuid[],
  p_include_global boolean default false        -- also list Global reports (space_id is null)
)
returns table (entity_type text, id uuid, space_id uuid, title text, deleted_at timestamptz)
language sql
stable
security invoker
set search_path = ''
as $$
  select 'task'::text, t.id, t.space_id, t.title, t.deleted_at
    from public.tasks t
   where t.deleted_at is not null and t.space_id = any (p_space_ids)
  union all
  select 'todo', d.id, d.space_id, d.title, d.deleted_at
    from public.todos d
    left join public.tasks pt on pt.id = d.task_id
   where d.deleted_at is not null and d.space_id = any (p_space_ids)
     and (d.task_id is null or pt.deleted_at is null)
  union all
  select case when n.kind = 'journal' then 'journal' else 'note' end, n.id, n.space_id,
         case when n.kind = 'journal' and n.title = '' then n.journal_date::text else n.title end,
         n.deleted_at
    from public.notes n
   where n.deleted_at is not null and n.space_id = any (p_space_ids)
  union all
  select 'event', e.id, e.space_id, e.title, e.deleted_at
    from public.events e
   where e.deleted_at is not null and e.space_id = any (p_space_ids)
  union all
  select 'report', r.id, r.space_id, r.title, r.deleted_at
    from public.reports r
   where r.deleted_at is not null
     and (r.space_id = any (p_space_ids) or (p_include_global and r.space_id is null))
  order by 5 desc;
$$;

-- Purge for the caller (RLS applies). p_space_ids null = all of the caller's spaces and Global reports.
create or replace function public.purge_trash(
  p_older_than interval default '30 days',
  p_space_ids  uuid[]   default null
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - p_older_than;
  v_count  integer := 0;
  v_n      integer;
begin
  delete from public.todos   where deleted_at < v_cutoff and (p_space_ids is null or space_id = any (p_space_ids));
  get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.tasks   where deleted_at < v_cutoff and (p_space_ids is null or space_id = any (p_space_ids));
  get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.events  where deleted_at < v_cutoff and (p_space_ids is null or space_id = any (p_space_ids));
  get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.notes   where deleted_at < v_cutoff and (p_space_ids is null or space_id = any (p_space_ids));
  get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.reports where deleted_at < v_cutoff and (p_space_ids is null or space_id = any (p_space_ids));
  get diagnostics v_n = row_count; v_count := v_count + v_n;
  return v_count;
end;
$$;

revoke execute on function public.trash_items(uuid[], boolean) from anon;
revoke execute on function public.purge_trash(interval, uuid[]) from anon;

-- Nightly purge for every user. Definer, so it lives in a schema PostgREST does not expose.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.purge_all_trash()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cutoff timestamptz := now() - interval '30 days';
  v_count  integer := 0;
  v_n      integer;
begin
  delete from public.todos   where deleted_at < v_cutoff; get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.tasks   where deleted_at < v_cutoff; get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.events  where deleted_at < v_cutoff; get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.notes   where deleted_at < v_cutoff; get diagnostics v_n = row_count; v_count := v_count + v_n;
  delete from public.reports where deleted_at < v_cutoff; get diagnostics v_n = row_count; v_count := v_count + v_n;
  return v_count;
end;
$$;

revoke execute on function private.purge_all_trash() from public, anon, authenticated;

create extension if not exists pg_cron;

select cron.schedule('axon-purge-trash', '0 3 * * *', $$select private.purge_all_trash()$$);
```

Notes on the SQL:
- **Checklist todos.** A todo whose task is in Trash is hidden from the listing. It was soft-deleted by `tasks_cascade_to_todos` with the task's exact `deleted_at`, and restoring the task restores it. A checklist todo deleted on its own while its task is alive is listed and restorable by itself. If its task is later deleted too, the todo keeps its own earlier timestamp and so stays deleted when the task is restored; it then reappears in Trash as a standalone entry.
- **Delete order.** Todos go first, then tasks (hard-deleting a task also cascades its remaining todos, `task_activity`, `task_tags` and `note_task_links`), then events, notes and reports. Hard-deleting a task or note sets `events.task_id` / `events.note_id` to null through the FKs. `inbox_items.processed_ref` becomes a dangling reference, which the Processed tab (13) renders as "Deleted".
- `trash_items` and `purge_trash` are `security invoker`, so they only see and delete the caller's rows. `purge_all_trash` is the one definer function besides the auth trigger. It lives in `private`, takes no arguments, has a hard-coded 30-day cutoff, and is executable only by its owner (the cron job runs as `postgres`).
- To roll back the job: `select cron.unschedule('axon-purge-trash');`.

Verify with `execute_sql`:
- `trash_items` returns a deleted standalone todo but not the checklist todos of a deleted task.
- `purge_trash('0 seconds', array[<space id>])` deletes only that space's trashed rows and returns the count.
- `select * from cron.job where jobname = 'axon-purge-trash'` shows the schedule.
- `select private.purge_all_trash()` works as `postgres`, and fails for role `authenticated`.
- Run `get_advisors` (security). The definer function must not be flagged as exposed.

### 2.2 API Layer

**`src/features/trash/api.js`**

| Export | Details |
|---|---|
| `trashKeys` | `{ all: ['trash'], lists: () => ['trash','list'], list: (params) => ['trash','list',params] }`; params `{ spaceIds, includeGlobal }` |
| `fetchTrash(params)` / `useTrash(params)` | `supabase.rpc('trash_items', { p_space_ids, p_include_global })`; `enabled: spaceIds?.length > 0` |
| `RESTORERS` | `{ task: restoreTask, todo: restoreTodo, note: restoreNote, journal: restoreNote, event: restoreEvent, report: restoreReport }`, imported from each feature's `api.js` |
| `INVALIDATES` | per type, the root keys to invalidate: task → `taskKeys.all, todoKeys.all, linkKeys.all, pinKeys.all`; todo → `todoKeys.all, taskKeys.all` (checklists); note/journal → `noteKeys.all` (and `journalKeys.all` if 09 has one), `linkKeys.all, pinKeys.all`; event → `eventKeys.all`; report → `reportKeys.all, pinKeys.all`. Also `searchKeys.all` and the dashboard root key for all types. |
| `restoreItem(entityType, id)` / `useRestoreTrashItem()` | dispatches through `RESTORERS`. **Optimistic** removal from every `trashKeys.lists()` cache; on success invalidates `INVALIDATES[type]` plus `trashKeys.all`. A Postgres `23505` on a journal restore (another entry now exists for that date, `notes_journal_unique`) rolls back and toasts "An entry for this date already exists. Open it to merge." |
| `deleteForever(entityType, id)` / `useDeleteForever()` | `supabase.from(TABLES[type]).delete().eq('id', id)` where `TABLES = { task: 'tasks', todo: 'todos', note: 'notes', journal: 'notes', event: 'events', report: 'reports' }`; add `.not('deleted_at','is',null)` as a guard so a live row can never be hard-deleted from here. Optimistic removal; invalidates `trashKeys.all`, plus `taskKeys.all` / `eventKeys.all` for the FK side-effects. |
| `emptyTrash({ spaceIds, includeGlobal })` / `useEmptyTrash()` | `supabase.rpc('purge_trash', { p_older_than: '0 seconds', p_space_ids: includeGlobal ? null : spaceIds })`. Global (`includeGlobal: true`) passes `null` (everything the user owns); a space passes `[space.id]`. Returns the count. Invalidates `trashKeys.all`. |

Scope, from `features/trash/hooks/useTrashScope.js`: inside a space `{ spaceIds: [space.id], includeGlobal: false }`; in Global `{ spaceIds: spaces.map(s => s.id), includeGlobal: true }`. Global deliberately includes **archived** spaces, because an archived space can't be opened and its trash would otherwise be unreachable. Rows from archived spaces show an "Archived" badge.

**`src/features/trash/utils.js`** (tested): `daysUntilPurge(deletedAt, now = new Date(), retentionDays = 30)` → integer ≥ 0; `groupTrash(rows)` → `[{ type, label, items }]` in the order Tasks, Todos, Notes, Journal, Events, Reports; `TRASH_RETENTION_DAYS = 30` in `constants.js`.

### 2.3 Components

```
src/features/trash/
├── api.js
├── constants.js                    # TRASH_RETENTION_DAYS, TYPE_LABELS
├── utils.js
├── hooks/
│   ├── useTrashScope.js
│   └── useRestoreWithSpaceCheck.js # restore + archived-space warning
├── components/
│   ├── TrashBanner.jsx             # "Items in Trash are deleted after 30 days."
│   ├── TrashGroup.jsx              # heading with count + AnimatedList of TrashItemRow
│   ├── TrashItemRow.jsx
│   └── TrashSkeleton.jsx
└── pages/TrashPage.jsx             # /s/:spaceSlug/trash
```

- **`TrashPage`**: `usePageHeader({ title: 'Trash', actions: <Button variant="outline" disabled={!rows?.length}>Empty trash</Button> })`, then `TrashBanner` and one `TrashGroup` per non-empty type. Wrapped in `PageTransition`.
  - **States:** `TrashSkeleton` (grouped row skeletons); `ErrorState` with retry; empty → `EmptyState` (Trash icon, "Trash is empty", "Deleted items stay here for 30 days.", no action); data.
  - **Empty trash** opens `ConfirmDialog` titled "Empty trash?", with the description "Permanently delete 12 items in THMP. This can't be undone." ("in all spaces" in Global), `confirmLabel="Empty trash"` and `pending` from the mutation. Success toast "Deleted 12 items".
- **`TrashItemRow`** `({ item, showSpace, archived })`: `EntityIcon`, the title (journal rows are formatted with `formatDate`; an empty title shows "Untitled"), "Deleted " + `formatRelative(deleted_at)` + " · purges in N days" (in `text-destructive` when N ≤ 3), a `SpaceBadge` in Global (plus an "Archived" badge), and two actions:
  - **Restore** (button with `RotateCcw`) → `useRestoreWithSpaceCheck`. Toast "Task restored" with an "Open" action (`entityPath`).
  - **Delete forever** (icon button, `aria-label`) → `ConfirmDialog` "Delete forever?" → `useDeleteForever`.
- **`useRestoreWithSpaceCheck`**: restores, then if `spaceById.get(item.space_id)?.archived_at` is set it toasts a warning, "Restored to THMP, which is archived", with the action "Unarchive" → `useUpdateSpace().mutate({ id, patch: { archived_at: null } })`.
- **Motion:** rows exit through `AnimatedList` (`listItem`, `layout`); a group whose last row leaves collapses by unmounting, never by animating height. The banner uses `fadeIn` on mount only.

### 2.4 Routes and Integration
- `router.jsx`: `/s/:spaceSlug/trash` → `features/trash/pages/TrashPage` (replaces the placeholder).
- `NavFooter` Trash link already exists (03). No badge.
- The palette's Navigate list already includes Trash (12).
- The "moved to Trash" toast in every feature gains a second action in a later pass only if the user asks. No change now.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04, 05, 06, 08, 09, 11 api | Restore functions called from Trash | Confirm `restoreX(id)` exists and is exported; add where missing |
| 03 spaces | Unarchive from the restore warning; archived-space rows in Global trash | Reuse `useUpdateSpace`; `spaces` (not `activeSpaces`) feeds the Global trash scope |
| 07 note links / activity | Hard-deleting a task or note removes links and activity by cascade | None (FK cascades); invalidate `linkKeys.all` |
| 08 events | `task_id` / `note_id` set null when the target is purged | Invalidate `eventKeys.all` on delete forever |
| 13 inbox Processed tab | `processed_ref` may point at a purged row | Already renders "Deleted" |
| Supabase project | New `private` schema, `pg_cron` extension and job | Record in the changelog and the Shared Infrastructure table |

### 2.6 Not in This Phase
- Version history for notes, tasks or reports: backlog
- Trash for spaces (spaces are archived or permanently deleted by typing their name, Feature 03): by design
- Trash for inbox items (discard is their reversible state, Feature 13): by design
- A configurable retention period: backlog (the 30 days is a constant in both SQL and `constants.js`)
- Bulk select in Trash: backlog

### 2.7 Checklist: Before Marking Complete
- [ ] `pg_cron` availability confirmed; migration applied and mirrored; advisors clean; every verification query above passes
- [ ] The cron job `axon-purge-trash` exists at `0 3 * * *` UTC; `private.purge_all_trash()` can't be called by `authenticated` or `anon`
- [ ] Trash lists soft-deleted tasks, standalone todos, notes, journal entries, events and reports for the scope, grouped, newest first
- [ ] Checklist todos of a trashed task aren't listed, and restoring the task brings them back with it
- [ ] Restore animates the row out, the item reappears in its feature list (and in Pinned if it was pinned), and the toast's Open works
- [ ] Restoring into an archived space shows the warning, and Unarchive makes the space active again
- [ ] Restoring a journal entry whose date is already taken shows the friendly error and keeps the row in Trash
- [ ] Delete forever requires a confirm and removes the row; a live row can't be deleted through this path
- [ ] Empty trash in a space removes only that space's items; in Global it removes everything, including Global reports
- [ ] The banner and the "purges in N days" text are correct (`daysUntilPurge` tested around the 30-day edge)
- [ ] Tests pass for `daysUntilPurge` and `groupTrash`
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status, DB registry (`trash_items()`, `purge_trash()` + pg_cron job ✅), Shared Infrastructure (`pg_cron`, `private` schema) and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
tasks.pinned_at · notes.pinned_at · reports.pinned_at        (existing columns, set by Pins)

trash_items(p_space_ids, p_include_global)       invoker  → rows with deleted_at not null
purge_trash(p_older_than, p_space_ids)           invoker  → hard delete for the caller, returns count
private.purge_all_trash()                        definer  → hard delete older than 30 days, all users
cron job 'axon-purge-trash'  0 3 * * * (UTC)     → select private.purge_all_trash()
```

### `trash_items` result row
| Column | Type | Notes |
|---|---|---|
| `entity_type` | text | task, todo, note, journal, event, report |
| `id` | uuid | entity id |
| `space_id` | uuid | null only for Global reports |
| `title` | text | journal rows with no title return the ISO `journal_date` |
| `deleted_at` | timestamptz | sort key; purge happens 30 days after it |

## Out of Scope (All Phases)
- Version history and point-in-time restore: backlog
- Trash for spaces or inbox items: by design (see 2.6)
- Pinning todos and events, and a pins page: backlog
- Export before purge: Feature 19
