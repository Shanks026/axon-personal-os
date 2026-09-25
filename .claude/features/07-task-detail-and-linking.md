# Feature 07: Task Detail and Note ↔ Task Linking

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/07-task-detail-and-linking.md`
**Status**: 🟡 In progress (Phase 1 ✅ 2026-09-25)
**Depends on**: 05, 06
**Last Updated**: September 2026

---

## Context

Features 04–06 give tasks, checklists and notes, but a task still has no home of its own and notes float free of the work they describe. This feature adds the task detail page (rich description, checklist, and an automatic activity log with manual work-log comments) and links notes to tasks many-to-many, first by hand and then through inline `[[task]]` mentions synced by RPC. The activity log and links are what make quarterly reports (Feature 11) trustworthy: every status change and every related note is recorded. It follows the Tercero task-detail layout without assignees or watchers.

---

## Phase Overview

```
Phase 1: Task detail page
  task_activity table + log trigger + backfill, /tasks/:taskId with inline title, rich description (autosave), checklist, meta rail, activity timeline with comments.

Phase 2: Manual links
  note_task_links table + log trigger, links api, EntityLink chip with hover preview, linked notes panel on tasks, linked tasks panel in notes, link counts on note cards.

Phase 3: Mentions
  [[ task mention node with search and create, sync_note_mentions RPC on save, mention backlinks with source badges.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Task Detail Page ✅ Complete (2026-09-25)

### Design fold (delta 07, the Task Detail screen, and the user's decisions; folded on 2026-09-25). This overrides the spec below where they differ.
- **Clicking a card opens the detail page** (decided by the user on 2026-09-25). This applies to the grid card body, the board card and the table title. The ⋮ menu keeps **Edit** for the quick dialog, and the dialog gains an **Open task** link in edit mode.
- **The space is fixed** (the user's rule, 2026-09-25): the rail shows the space **read-only** (emoji and name). There is **no** space Select and **no** `useMoveTaskToSpace`. The trigger still logs `space`, which is harmless.
- **Links, not an external-link field:** tasks have `task_links` (many). The rail lists them as **link cards**: GitLab MR URLs read "!1431 · group/project", Jira URLs read the issue key, and anything else reads the host. Each card opens in a new tab and can be removed. There's an inline "Add a link" input (the `LinksField` pattern).
- **The task dialog keeps its checklist** (the user's decision in Feature 05 follow-ups). Only the detail page's checklist is added; the dialog's isn't removed.
- **Versions** get a rail row (`VersionPicker` + badges) through `useQuickUpdateTask`.
- **Header:** the breadcrumb (space › Tasks › title), **previous/next** (chevron up/down, **J/K**) and a ⋯ menu (Edit in dialog, Move to Trash).
  - Previous/next follow the list order the task was opened from, passed in router `state.order` by the Tasks page. They're hidden when there's none, such as a direct link.
- **Activity:** one "Activity" stream, **oldest first**, with **no toggle**.
  - The composer is at the **bottom**: "Log work or leave a note…" plus a `Kbd` Mod+Enter hint.
  - Manual entries are cards labelled **Work log**; automatic entries are one-line sentences with a relative time.
- **Rail:** Status, Priority, Start, Due, Space, Created, Completed, then Tags, Versions and Links.
  - The footer has a **Pinned** switch (`tasks.pinned_at`, moved forward from 14) and **Move to Trash** (destructive).
  - The rail is 300px (`w-75`) with 84px (`w-21`) labels. It becomes a Sheet below `lg`, like the note editor's details.
- **Layout:** the main column is at most 720px (`max-w-180`), padded 40/56. The title is the display style.
- **Linked notes** are Phase 2.

### Goal
Clicking a task (row or board card) opens `/s/:slug/tasks/:taskId`. The main column holds an inline-editable title, a rich description that autosaves, the checklist from Feature 05, and an Activity & Work log timeline that reads as sentences ("Status In progress → In review · 2h ago") with a composer for manual log entries. The right rail edits status, priority, dates, tags, space, external link, shows created and completed times, and deletes the task.

### Before Starting: Confirm With Codebase
1. Features 05 and 06 are complete: `TodoChecklist`, `RichTextEditor`, `useAutosave`, `SaveIndicator`, `TagPicker`, `StatusPopover`, `TaskStatusIcon`, `TaskPriorityIcon`, `DatePicker` and `useQuickUpdateTask` exist.
2. `tasks/:taskId` is still a placeholder route; `paths.space(slug).task(id)` exists.
3. Read the current `useUpdateTask` and `useQuickUpdateTask` in `src/features/tasks/api.js`; both change below (detail-cache merge, activity invalidation).
4. Use the Supabase MCP to confirm `public.task_activity` does not exist and count existing tasks (for the backfill check).

### 1.1 Database
Migration `create_task_activity`: the SQL from `data-model.md` **task_activity**, plus the backfill.

```sql
create table public.task_activity (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  task_id     uuid not null,
  kind        text not null check (kind in
                ('created','status','priority','due_date','title','space','note_linked','note_unlinked','comment')),
  from_value  text,
  to_value    text,
  body        text check (char_length(body) <= 5000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  foreign key (task_id, user_id) references public.tasks(id, user_id) on delete cascade
);
create index task_activity_task_idx on public.task_activity (task_id, created_at desc);
create trigger task_activity_updated_at before update on public.task_activity
  for each row execute function public.set_updated_at();
alter table public.task_activity enable row level security;
create policy "task_activity_owner_all" on public.task_activity for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

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

-- backfill: one 'created' row per existing task
insert into public.task_activity (user_id, task_id, kind, to_value, created_at, updated_at)
select t.user_id, t.id, 'created', t.status, t.created_at, t.created_at from public.tasks t;
```

Verify: the backfill count equals the task count; a status change inserts exactly one `status` row; a position-only update (board reorder) inserts nothing. Run advisors.

### 1.2 API Layer
Additions to `src/features/tasks/api.js`:

```js
// added to taskKeys
activities: () => [...taskKeys.all, 'activity'],
activity: (taskId) => [...taskKeys.activities(), taskId],
```

| Function / hook | Details |
|---|---|
| `fetchTask(id)` / `useTask(id)` | **Exists since 06 Phase 3** as `select('id, description')` (the task dialog's rich description), key `detail(id)`. Widen it here to `select('*, tag_ids:task_tags(tag_id)')` and map `tag_ids`; the dialog keeps working, since it only reads `description`. `enabled: !!id`. Not scope-filtered |
| `useUpdateTask()` (changed) | **Merging done in 06 Phase 3:** `onSuccess` merges into `detail(id)` (`{ ...old, ...row }`, plus `patch.description` when sent), because the returned list columns omit `description`. Still to add here: invalidate `activity(id)` |
| `useQuickUpdateTask()` (changed) | also patches `detail(id)` optimistically; `onSettled` invalidates `activity(id)` |
| `useMoveTaskToSpace()` | `({ id, spaceId })`: updates `space_id`, then deletes `task_tags` whose tag is scoped to a different space (tags with `space_id` null are kept). Returns `{ task, removedTagCount }`. Invalidates `taskKeys.all`, `todoKeys.all` (checklist follows by trigger) and `tagKeys.all` |
| `fetchTaskActivity(taskId)` / `useTaskActivity(taskId)` | `select('id, kind, from_value, to_value, body, created_at, updated_at').eq('task_id', taskId).order('created_at', { ascending: false }).limit(200)`; key `activity(taskId)` |
| `addTaskComment({ taskId, body })` / `useAddTaskComment()` | insert `{ task_id, kind: 'comment', body }` (body trimmed 1–5000); invalidates `activity(taskId)` |
| `updateTaskComment(id, body)` / `useUpdateTaskComment()` | `.update({ body }).eq('id', id).eq('kind', 'comment')`; invalidates `activities()` |
| `deleteTaskComment(id)` / `useDeleteTaskComment()` | hard delete `.eq('kind', 'comment')`; invalidates `activities()` |

`src/features/tasks/utils.js` gains `describeActivity(entry, { spaceById })` → `{ icon, text }` (tested for every kind):
- `created` "Created" · `status` "Status In progress → In review" · `priority` "Priority Low → High" · `due_date` "Due date set to 26 Sep" / "Due date 20 Sep → 26 Sep" / "Due date cleared" · `title` "Renamed from 'Old title'" · `space` "Moved from THMP to Personal" (an unknown id reads "a deleted space").
- `note_linked` / `note_unlinked` are added in Phase 2.

### 1.3 Components

```
src/components/shared/SaveIndicator.jsx      # moved from features/notes/components (second consumer)
src/features/tasks/
├── components/
│   ├── TaskDetail.jsx            # two-column layout; composes the pieces below
│   ├── TaskTitleInput.jsx        # ({ task }) auto-growing textarea; Enter or blur saves via useUpdateTask; Esc reverts; empty reverts
│   ├── TaskDescription.jsx       # ({ task, onStatusChange }) RichTextEditor + useAutosave
│   ├── TaskMetaRail.jsx          # ({ task })
│   ├── ActivityTimeline.jsx      # ({ taskId })
│   ├── ActivityEntry.jsx         # ({ entry }) icon + sentence + relative time (Tooltip = formatDate absolute)
│   ├── CommentEntry.jsx          # ({ entry }) body (whitespace-pre-wrap), "edited", menu: Edit, Delete
│   ├── CommentComposer.jsx       # ({ taskId }) textarea; Ctrl/Cmd+Enter submits; pending state
│   └── TaskDetailSkeleton.jsx
└── pages/TaskDetailPage.jsx      # /s/:slug/tasks/:taskId
```

**`TaskDetailPage`**
- `useTask(taskId)`. Canonical redirect as in Feature 06: when not in Global and `task.space_id !== space.id`, `<Navigate replace>` to the task's space URL. Missing or soft-deleted → `EmptyState` "This task doesn't exist or is in Trash" with a link to Tasks. Archived space → "This task is in an archived space".
- `usePageHeader({ title: task.title, breadcrumbs: [Tasks], actions: <SaveIndicator status={descriptionStatus}/> })`.
- Loading: `TaskDetailSkeleton` (title bar, description block, rail fields). Error: `ErrorState`.

**`TaskDetail`**: main column (≥ `lg`, left) holds `TaskTitleInput`, `TaskDescription`, `TodoChecklist taskId spaceId` (Feature 05), then `ActivityTimeline`. `TaskMetaRail` sits on the right, and above the main column on narrow screens.

**`TaskDescription`** (the editor itself is already built in 06 Phase 3, for the task dialog; this is the page variant with autosave): `RichTextEditor key={task.id} value={task.description} placeholder="Add a description… Type '/' for commands" features={{ slash: true, onSave: flush }}`. `onChange(json, text)` → `schedule({ description: json, description_text: text })` on `useAutosave({ save: (patch) => updateTask.mutateAsync({ id, patch }) })`. It reports `status` up for the header indicator.

**`TaskMetaRail`** (a vertical list of label/control rows)
- Status: `StatusPopover` · Priority: DropdownMenu · Start and Due: `DatePicker` (start ≤ due is enforced by disabling invalid days; a DB rejection toasts) · all three through `useQuickUpdateTask`.
- Tags: pills + `TagPicker spaceIds=[task.space_id] createSpaceId=task.space_id` → `useSetTaskTags`.
- Space: Select of active spaces → `useMoveTaskToSpace`. On success: `toast.success('Moved to Personal')`, adding "· 2 tags removed" when `removedTagCount > 0`; when not in Global, navigate (replace) to the task's new canonical URL.
- External link: inline input (URL validated with the `taskSchema` rule) plus an open button (`aria-label="Open link"`).
- Created `formatDate(created_at)`, Completed `formatDate(completed_at)` when set, Updated `formatRelative(updated_at)`.
- Delete (destructive ghost button): soft delete, navigate to Tasks, then the Undo toast (Undo restores and the user can reopen it from the list).

**`ActivityTimeline`**
- Header "Activity & Work log" with a ToggleGroup: All | Work log (comments only), in local state.
- `CommentComposer` at the top, then entries newest first. Comments render as `CommentEntry`; everything else as `ActivityEntry` built from `describeActivity`.
- Comment edit is inline (Ctrl/Cmd+Enter saves, Esc cancels). "edited" shows when `updated_at` is more than 1s after `created_at`. Delete uses `ConfirmDialog` (a permanent delete).
- States: 4-row skeleton; `ErrorState`; empty is impossible after the backfill, but render "No activity yet" defensively.
- Motion: new entries enter via `AnimatedList` (`listItem`).

### 1.4 Routes and Integration
- `router.jsx`: `tasks/:taskId` → `TaskDetailPage` (replaces the placeholder).
- `TaskRow`: the title button now navigates to `p.task(task.id)`. The row menu keeps "Edit" (opens `TaskDialog` for a quick edit). The same for `BoardCard` clicks.
- `TaskDialog`: the Feature 05 checklist section is removed (the detail page owns it); the dialog gains an "Open task" link in edit mode. Its `initialValues` / `onSuccess(row)` contract and standalone mounting (for `?new=task` in Feature 12) stay unchanged. The `LinkedTasksPanel` "New task…" input in Phase 2 may open it with `initialValues={{ title, space_id: note.space_id }}` and link in `onSuccess(row)` when the user wants more than a title.

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 `useUpdateTask`, `useQuickUpdateTask` | Detail cache and activity | Merge into `detail(id)`; invalidate `activity(id)` |
| 04 `TaskRow`, `BoardCard` | Click target | Navigate to the detail page |
| 05 `TaskDialog` checklist | Moves to the detail page | Remove the section; keep `TodoChecklist` unchanged |
| 05 `TaskChip` | The route now renders | None |
| 06 `SaveIndicator` | Second consumer | Move to `components/shared/`; update the notes import |

### 1.6 Not in This Phase
- Linked notes and mentions (Phases 2–3)
- Sub-tasks, dependencies, time tracking: backlog
- Activity for `start_date`, `external_url`, `description` edits: not logged by design (noise)

### 1.7 Checklist: Before Marking Complete
- [x] `create_task_activity` is applied and mirrored; the backfill count matches (15 of 15); reorders don't log; advisors are clean
- [x] Row and card clicks open the detail page; the canonical redirect, missing, deleted and archived states work
- [x] Title edits save on blur and Enter and log a `title` entry
- [x] The description autosaves with the indicator, survives reload, and flushes on navigation
- [x] Every rail control persists; status, priority and dates update the page instantly and appear in the timeline
- [x] ~~Moving space…~~ Not applicable: the space is fixed (design fold); it's shown read-only
- [x] Comments add with Ctrl/Cmd+Enter, edit inline, show "edited", and delete with a confirm
- [x] `describeActivity` tests cover every kind
- [x] `npm run lint`, `npm test` and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` DB registry, status and changelog are updated

### 1.8 Implementation Notes
- **Migration `20260925130331`** (`create_task_activity`). Verified in a rolled-back transaction: a position-only update and a no-op update log nothing, and one status change logs exactly one `status` row. Advisors show nothing new.
- **`fetchTask`** is widened to `*` + `tag_ids` + `links` (mapped).
  - `useOptimisticPatch` (behind `useQuickUpdateTask` and `useMoveTask`) also patches `detail(id)`, and on settle invalidates the lists, the detail and `activity(id)`.
  - `useUpdateTask` also invalidates `activity(id)`, and `useSetTaskTags` invalidates `detail(taskId)`.
- **Activity** is fetched newest-first with limit 200, then reversed (so it shows oldest first).
  - Comments are hard-deleted via `ConfirmDialog`.
  - `describeActivity` and `isEdited` are in `utils.js` (tested). `ActivityTime` has its own file (it's shared by the two entry kinds).
- **Links:** `linkInfo(url, label)` (GitLab MR "!1431 · group/project", Jira key from `/browse/` or `selectedIssue`, else host; a label wins; tested) drives `TaskLinkCards`. Lucide has no GitLab brand icon, so MRs use `git-pull-request-arrow` and Jira uses `ticket`.
- **Rail:** Status, Priority, Start, Due, Space (read-only), Created, Completed, Updated, then Tags, Versions and Links, then Pinned (`pinned_at`) and a `destructive` Move to Trash.
  - The rail is 320px (**widened from the design's 300 at the user's request**) and becomes a Sheet below `lg`. The Details toggle is remembered as `axon:tasks:rail`.
  - There's no `useMoveTaskToSpace` (the space is fixed).
- **Header:** `SaveIndicator` (with Retry), previous/next (J/K), Details and ⋯ (Edit in dialog, Move to Trash).
  - Previous/next use `location.state.order`, set by the Tasks page from the grid/table sort or the board's order, and navigate with `replace`, so Back returns to the list.
- **Clicks:** grid card body, board card and table title call `onOpen` (the detail page); the ⋮ Edit calls `onEdit` (the dialog). The dialog has **Open task** in edit mode, hidden when opened from the detail page.
- **Kept, per the user's earlier decisions:** the task dialog's checklist.
  - `ChecklistSection` gains `className` (the page drops its border and padding).
- **`TitleTextarea`** is new in `components/shared`, lifted from notes' `NoteTitleInput` now that tasks need it. It passes `ref` and extra props through, and is used by the note editor, the task detail title, and (at the user's request) the task dialog's title, which now wraps onto more lines instead of being cut off.
- **Description** (at the user's request): `RichTextEditor fit` drops the 12rem minimum height (`axon-prose-fit`), so it's only as tall as its content, in `text-sm leading-6`.
- **Known limit:** "Edit in dialog" and the page's description editor are separate editors. Saving a description change from the dialog doesn't refresh the page's (uncontrolled) editor until reload.
- **Tests:** helpers (describeActivity, isEdited, linkInfo), an 8-case `TaskDetailPage` suite (render and activity order, title save, rail status → timeline, work-log add, J navigation, no list → no prev/next, trash → back to list, not found), and updated Tasks page tests for the new click behaviour and "Open task".
  - Two note-flow waits get a 5s timeout because the full suite runs files in parallel.

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Manual Links

### Goal
On a task, the user sees its linked notes, links an existing note through a search picker, or creates a new linked note in one click. In the note editor, a collapsible side panel shows the note's linked tasks and can link an existing task or create one. Links show as chips with the entity's icon or status and a hover preview. Note cards show how many tasks they link to, and link changes appear in the task's activity log.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. `npx shadcn@latest add hover-card` (not in the Feature 01 set). Note that Radix HoverCard does not open on keyboard focus, so the preview is an enhancement; the chip itself is a normal link.
3. Confirm PostgREST `!inner` embeds with a filter on the embedded table (`notes!inner(...)` + `.is('note.deleted_at', null)` using the alias) and embedded counts (`note_task_links(count)`).
4. Confirm `upsert(..., { onConflict: 'note_id,task_id' })` updates `source` without firing the insert trigger twice.

### 2.1 Database
Migration `create_note_task_links`:

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
```

`sync_note_mentions` is created in Phase 3. Verify: link and unlink each log one activity row; hard-deleting a test task (and a test space) that has links succeeds without FK errors. Run advisors.

### 2.2 API Layer
`src/features/links/api.js`:

```js
export const linkKeys = {
  all: ['links'],
  notesForTask: (taskId) => [...linkKeys.all, 'notes-for-task', taskId],
  tasksForNote: (noteId) => [...linkKeys.all, 'tasks-for-note', noteId],
}
```

| Function / hook | Details |
|---|---|
| `fetchNotesForTask(taskId)` / `useNotesForTask(taskId)` | `from('note_task_links').select('source, created_at, note:notes!inner(id, space_id, title, excerpt, updated_at, deleted_at)').eq('task_id', taskId).is('note.deleted_at', null).order('created_at', { ascending: false })` |
| `fetchTasksForNote(noteId)` / `useTasksForNote(noteId)` | same shape with `task:tasks!inner(id, space_id, title, status, priority, due_date, deleted_at)`. The hook's `queryFn` also seeds `taskKeys.summary(id)` for each task (used by mention chips in Phase 3) |
| `linkNoteTask({ noteId, taskId })` / `useLinkNoteTask()` | `upsert({ note_id, task_id, source: 'manual' }, { onConflict: 'note_id,task_id' })`, so a mention link becomes manual |
| `unlinkNoteTask({ noteId, taskId })` / `useUnlinkNoteTask()` | delete `.eq('source', 'manual')` |
| both mutations | invalidate `linkKeys.all`, `taskKeys.activities()` and `noteKeys.lists()` (counts) |

Other additions:
- `src/features/tasks/api.js`: `taskKeys.search(params)` and `summary(id)`; `searchTasks({ spaceIds, q, limit = 8 })` (title ilike, not deleted, open statuses first then `updated_at desc`) with `useTaskSearch(params)`; `fetchTaskSummary(id)` / `useTaskSummary(id)` (`id, space_id, title, status, deleted_at`, `staleTime: 60_000`).
- `src/features/notes/api.js`: `fetchNotesByIds(ids)` / `useNotesByIds(ids)` (`id, title, deleted_at`) for activity sentences; `fetchNotes` adds `link_count:note_task_links(count)`.
- `useDeleteTask` / `useRestoreTask` and `useDeleteNote` / `useRestoreNote` also invalidate `linkKeys.all`.
- `describeActivity` handles `note_linked` "Linked note 'Sprint 14 retro'" and `note_unlinked` "Unlinked note '…'", reading titles from a `noteTitleById` map (`useNotesByIds` on the ids in the loaded activity). A deleted note reads "a deleted note".

### 2.3 Components

```
src/components/shared/
├── EntityLink.jsx               # ({ kind: 'task'|'note', id, spaceId, label, status, deleted, preview = true, size = 'sm' })
└── EntityPreviewCard.jsx        # HoverCard content; fetches useTaskSummary / useNote only while open
src/features/links/
├── api.js
└── components/
    ├── LinkedNotesPanel.jsx     # ({ task }) on the task detail page
    ├── LinkedTasksPanel.jsx     # ({ note }) in the note editor
    ├── NotePickerDialog.jsx     # ({ open, onOpenChange, excludeIds, onPick }) CommandDialog over useNotes (all active spaces, q debounced)
    ├── TaskPickerDialog.jsx     # ({ open, onOpenChange, excludeIds, onPick }) CommandDialog over useTaskSearch
    └── LinkRow.jsx              # ({ link, kind, onUnlink }) EntityLink + meta + unlink button
```

**`EntityLink`**: an inline chip that is a `<Link>` to `paths.space(spaceById.get(spaceId).slug).task(id)` or `.note(id)`. The icon is `TaskStatusIcon` for tasks and `FileText` for notes. A `deleted` target renders muted, struck through and not linked ("Deleted task"). With `preview`, a HoverCard shows `EntityPreviewCard`: for a task, status, priority, due label and space; for a note, the title, excerpt and updated time.

**`LinkedNotesPanel`** (task detail main column, between the checklist and activity): header "Notes" with a count, a "Link note" button (→ `NotePickerDialog`, excluding linked ids) and "New linked note" (creates `{ space_id: task.space_id, title: task.title }`, links it, then navigates to the note). Rows: `LinkRow` with the excerpt and updated time. Empty: "No linked notes. Link one or start a new note."

**`LinkedTasksPanel`** (note editor): a collapsible side panel on `≥ xl` and a collapsible section under the tags row on smaller screens; open state in `useLocalStorage('axon:note:linksOpen', true)`. Rows show status, title and due label. "Link task" opens `TaskPickerDialog`; a "New task…" input creates `{ space_id: note.space_id, title }` with `useCreateTask` then links it. Empty: "Not linked to any task."

Pickers list results with `SpaceBadge` (links may cross spaces), keyboard-first, with loading and "No results" states. Motion: rows via `AnimatedList`; the side panel slides in with `slideUp`/`fadeIn` presets (transform and opacity only).

**`NoteCard`** shows a `Link2` icon with `link_count` when it is above zero.

### 2.4 Routes and Integration
- `TaskDetail` mounts `LinkedNotesPanel`; `NoteEditorPage` mounts `LinkedTasksPanel`.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 task delete and restore | Links hide or reappear | Invalidate `linkKeys.all` |
| 06 notes api and `NoteCard` | Link counts; delete invalidation | Add `link_count`; invalidate `linkKeys.all` |
| 06 `NoteEditorPage` layout | Side panel | Main column narrows on `≥ xl` when the panel is open |
| 07 Phase 1 `describeActivity` | Two new kinds | Add sentences + tests |

### 2.6 Not in This Phase
- `[[` mentions and the sync RPC (Phase 3)
- Linking events or journal entries (08, 09)
- A graph view of links: backlog

### 2.7 Checklist: Before Marking Complete
- [ ] `create_note_task_links` is applied and mirrored; the log trigger and the purge-safety checks pass; advisors are clean
- [ ] Link, unlink and "New linked note" work from a task; link, unlink and "New task…" work from a note
- [ ] Both sides update without reload; the task timeline shows "Linked note …" / "Unlinked note …"
- [ ] Chips navigate to the right space URL, show hover previews, and render deleted targets muted
- [ ] Soft-deleting a note hides it from the task panel; Undo brings it back
- [ ] Note cards show link counts
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` DB registry, status, changelog (new shared `EntityLink`) and `axon-data-patterns.md` §10 are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 3: Mentions

### Goal
In a note, typing `[[` opens a task search. Picking a task inserts a live chip showing its current status and title; "Create task '…'" creates one in the note's space and inserts it. When the note saves, mentioned tasks become `mention` links, and removed mentions unlink. The task's linked-notes panel shows mention backlinks with a "Mentioned" badge.

### Before Starting: Confirm Phase 2 Is Approved
1. Phase 2 is `✅ Complete`.
2. **Check multi-character triggers** in the current `@tiptap/suggestion` / `@tiptap/extension-mention` (v3 accepts `suggestion` or a `suggestions` array). Spike `char: '[['` with `allowSpaces: true`. If it does not match reliably, fall back to `char: '['` with a custom `findSuggestionMatch` that requires the preceding character to be `[`, and have `command` delete `range.from - 1` so both brackets go. Record the choice in Implementation Notes.
3. Confirm `ReactNodeViewRenderer` for an atom inline node and `renderText` (used for `getText` and Markdown).
4. `createSuggestionRenderer` from Feature 06 is reusable for the mention list.

### 3.1 Database
Migration `create_sync_note_mentions`:

```sql
-- Reconcile mention-sourced links for a note. Manual links are never touched.
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
```

The insert selects from `tasks`, so a mention of a purged task is skipped instead of failing the FK, and RLS limits it to the caller's own tasks. Verify: a new id adds a `mention` link; an empty array removes only mention links; a manual link survives both. Run advisors.

### 3.2 API Layer
Additions to `src/features/links/api.js`:

| Function / hook | Details |
|---|---|
| `syncNoteMentions({ noteId, taskIds })` | `supabase.rpc('sync_note_mentions', { p_note_id, p_task_ids })` |
| `useSyncNoteMentions()` | invalidates `linkKeys.all`, `taskKeys.activities()`, `noteKeys.lists()`; toasts on error |

`src/features/links/utils.js` (tested): `collectTaskMentionIds(doc)` walks Tiptap JSON and returns unique, sorted `taskMention` ids; `sameIds(a, b)`.

### 3.3 Components

```
src/components/editor/extensions/
└── TaskMention.js               # Mention.extend({ name: 'taskMention' }) configured from features.taskMentions
src/components/editor/
└── MentionList.jsx              # suggestion list: results + "Create task '…'" row; keyboard ↑ ↓ Enter, Esc
src/features/links/components/
├── TaskMentionChip.jsx          # NodeView: useTaskSummary(id) → EntityLink (live status, falls back to attrs.label)
└── (changes) LinkRow.jsx, LinkedNotesPanel.jsx, LinkedTasksPanel.jsx
src/features/links/hooks/useTaskMentionsConfig.js   # builds the features.taskMentions object for a note
```

- **Editor contract:** `features.taskMentions = { search(query) → Promise<Array<{ id, label, status, spaceId }>>, create(title) → Promise<{ id, label }>, NodeView }`. The editor never imports feature code. The node is `{ type: 'taskMention', attrs: { id, label } }`, atom and inline; `renderText` gives `[[label]]`.
- **`useTaskMentionsConfig(note)`**: `search` calls `queryClient.fetchQuery({ queryKey: taskKeys.search(p), queryFn: () => searchTasks(p) })` with `spaceIds = isGlobal ? scopeSpaceIds : [note.space_id]`, limit 8; an empty query returns recently updated open tasks. `create` calls `createTask({ space_id: note.space_id, title })`, then invalidates `taskKeys.lists()`. `NodeView` is `TaskMentionChip`.
- **`MentionList`**: rows show `TaskStatusIcon`, title and (in Global) the space name. "Create task '…'" appears when the query has no exact title match. Loading and "No tasks" states. `scaleIn` entrance.
- **`TaskMentionChip`**: `contenteditable=false`; renders `EntityLink kind="task"` with the live title and status. A deleted task shows muted and struck through. Clicking navigates.
- **Sync on save (`NoteEditorPage`)**: `lastSyncedRef` is initialised from `collectTaskMentionIds(note.content)` on load. After each successful content save, compute the ids from the saved JSON; when `!sameIds(ids, lastSyncedRef.current)`, call `useSyncNoteMentions` and update the ref on success. `RichTextEditor` in notes gets `features={{ slash: true, taskMentions: config, onSave: flush }}`.
- **Backlinks:** `LinkRow` shows a "Mentioned" badge for `source = 'mention'`. Its unlink button is disabled, with the Tooltip "Remove the mention in the note", in both panels. Manual linking of an already mentioned pair upgrades it to manual (Phase 2 upsert).

### 3.4 Routes and Integration
- Only `NoteEditorPage` enables `taskMentions`. The task description editor does not (see Out of Scope).

### 3.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 06 `RichTextEditor` / `buildExtensions` | New optional extension | Add `TaskMention` when `features.taskMentions` is set |
| 06 Copy as Markdown | Mention nodes | Serialise as `[[label]]` via `renderText` / a serializer rule |
| 07 Phase 2 panels | Source badge | Disable unlink for mention links |
| 09 journal (future) | Journal entries are notes | 09 enables mentions and the same sync |

### 3.6 Not in This Phase
- Mentions inside task descriptions (links there would not be recorded): backlog
- Note-to-note `[[note]]` links: backlog
- Converting pasted `[[text]]` into mention nodes: backlog

### 3.7 Checklist: Before Marking Complete
- [ ] `create_sync_note_mentions` is applied and mirrored; the three RPC checks pass; advisors are clean
- [ ] `[[` opens the search, filters as you type (including spaces), and inserts a chip on Enter or click
- [ ] "Create task '…'" creates the task in the note's space and inserts its chip
- [ ] Chips show the live status after the task changes elsewhere
- [ ] Saving adds `mention` links; deleting a chip and saving removes only that link; manual links are untouched
- [ ] Task panels show "Mentioned" badges with the unlink disabled and the tooltip
- [ ] `collectTaskMentionIds` and `sameIds` have unit tests
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` DB registry, status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
tasks 1 ── n task_activity        (trigger-logged + manual 'comment' rows)
notes n ── n tasks                (note_task_links, source manual | mention)
note_task_links insert/delete ──► task_activity (note_linked / note_unlinked)
sync_note_mentions(p_note_id, p_task_ids) reconciles mention rows only
```

### `task_activity`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK |
| `task_id` | uuid | composite FK to tasks, cascade |
| `kind` | text | created, status, priority, due_date, title, space, note_linked, note_unlinked, comment |
| `from_value` / `to_value` | text | previous and new value (ids for space and note kinds) |
| `body` | text | comment text, ≤ 5000 |
| `created_at` / `updated_at` | timestamptz | `updated_at` marks edited comments |

### `note_task_links`
| Column | Type | Notes |
|---|---|---|
| `note_id`, `task_id` | uuid | PK pair; composite FKs, cascade |
| `source` | text | manual or mention |
| `created_at` | timestamptz | |

## Out of Scope (All Phases)
- Mentions in task descriptions, and note-to-note links: backlog
- Linking events to tasks and notes: Feature 08
- Journal mentions: Feature 09
- Activity digests and report use of activity: Features 10 and 11
- Sub-tasks, dependencies, time tracking: backlog
