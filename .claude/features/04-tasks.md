# Feature 04: Tasks (List, Board and Tags)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/04-tasks.md`
**Status**: 🟡 Phase 1 ✅ · Phase 2 ✅ · Phase 3 next
**Depends on**: 03
**Last Updated**: September 2026

---

## Context

Tasks are the tracked units of work: the THMP tickets, MRs and chores that later feed the quarterly report. Each task has a status, priority, optional start and due dates, an external link (GitLab MR or Jira) and tags. This feature adapts Tercero's task list and kanban, drops assignees and workspaces, and is the first real consumer of `scopeSpaceIds`: every read takes `spaceIds`, so the same page works inside a space and in Global. The rich description, checklist and activity log arrive in Features 05 and 07.

---

## Phase Overview

```
Phase 1: Core list
  tasks table, api.js, list view grouped by status, create/edit dialog, quick status change, filters in the URL, soft delete + Undo.

Phase 2: Board view
  ?view=board kanban with a column per status, dnd-kit drag across columns (status + position), quick-add per column.

Phase 3: Tags
  tags + task_tags tables, tags api, TagPicker / TagPill / ManageTagsDialog shared components, tag assignment and tag filter.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Core (grid and list) ✅ Complete

### Design fold (deltas G1–G3 and 04/05, folded on 2026-09-23). This overrides the spec below where they differ.
- **Page = "Tasks"** (G1 was reversed on 2026-09-24: Todos have their own page in Feature 05).
  - The header shows the title with a weight-300 count, and a subtitle (the space description, or "Everything across …" in Global).
  - Header actions: **New task**.
  - `HeaderAlert` in the page header: "N overdue · Review" applies `due=overdue`.
- **Tabs** (`?tab=`): **All · In progress · Completed**, each with a count. (A "Tasks" tab existed only to sit beside a Todos tab; it was removed with the split.)
  - All: every task.
  - In progress: `in_progress` and `in_review`.
  - Completed: `done`.
  - Tabs and the status filter apply on the client over one scoped query, so all the counts stay live.
- **Toolbar:** a 340px search on the left. On the right: Status, Priority and Due filter buttons (Tags in Phase 3), then a **view `SegmentedControl`**: Grid (default), List, and Board (Phase 2).
- **Grid view (default)** (G2): 3-column `TaskCard`s.
  - Top row: a filled status pill (click to change), an outlined priority pill, an MR link chip, and a `⋮` menu.
  - Then the title (16px/600), a 2-line description preview, and a dashed-top footer with the space (emoji and name) plus a mono due label in its tone.
  - Clicking the card opens the edit dialog (the detail page comes in 07).
- **List view:** the original grouped `TaskRow` spec below, with the "Done" label now "Completed" (G3).
- **TaskDialog** (delta 04, a Linear-style 640px panel):
  - A space chip plus "› New task".
  - A large borderless title and an **"Add description…"** textarea. The text saves as `description_text`, and as a Tiptap doc with one paragraph per line in `description`.
  - **Property chips:** Status, Priority, Start, Due and Link (Tags in Phase 3).
  - Footer: a **Create more** switch (keeps the dialog open and clears the title), plus Create task with ⌘↵.
  - The space chip is always shown and editable. It defaults to the current space.
- **Status and priority visuals** follow `design-system.md`: filled tint pills for status and outlined dot pills for priority. Label changes: "Done" becomes "Completed" and "No priority" becomes "None".
- **New shared components** (G7): `StatusPill`, `PriorityPill`, `PropertyChip`, `HeaderAlert`, `DueLabel`, `DatePicker`, and `SpaceChipPicker` (replacing the `SpacePickerField` plan).

### Goal
At `/s/:slug/tasks` the user sees their tasks grouped by status in collapsible groups with counts. They can create and edit a task (title, status, priority, start and due dates, external link, and a space when in Global), change status from the row in one click, filter by status, priority, due window and a title search (all in the URL, so filtered views are shareable and survive reloads), and delete a task with an Undo toast. In Global every row shows its space badge.

### Before Starting: Confirm With Codebase
1. Feature 03 is complete: `useSpace()` returns `scopeSpaceIds`, `isGlobal`, `activeSpaces`, `spaceById`; `SpaceBadge`, `SpaceIcon`, `usePageHeader`, `useSpacePaths` exist; `/s/:spaceSlug/tasks` is a placeholder page.
2. `lib/dates.js` exports `formatDueLabel`, `toISODate`, `parseISODate`, `isOverdue`; `lib/position.js` exports `positionAfterLast`; `AnimatedList`, `EmptyState`, `ErrorState` exist.
3. `components/shared/SpacePickerField.jsx`: the patterns catalogue lists it under Feature 03, but the 03 doc does not build it. If it is missing, create it here (1.3). Same for `DatePickerField` (new here).
4. `design-system.md` is still a placeholder unless the user has approved a design. If so, use shadcn defaults and semantic tokens only, and flag the row and dialog layouts for a design pass.
5. Use the Supabase MCP `list_tables` to confirm `public.tasks` does not exist yet.

### 1.1 Database
Migration `create_tasks`: the SQL from `data-model.md` **tasks**, written out in full.

```sql
create table public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users(id) on delete cascade,
  space_id          uuid not null,
  title             text not null check (char_length(btrim(title)) between 1 and 300),
  description       jsonb,
  description_text  text not null default '',
  status            text not null default 'todo'
                    check (status in ('todo','in_progress','in_review','blocked','done','cancelled')),
  priority          text not null default 'none'
                    check (priority in ('none','low','medium','high','urgent')),
  start_date        date,
  due_date          date,
  completed_at      timestamptz,
  external_url      text,
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

create trigger tasks_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
create policy "tasks_owner_all" on public.tasks for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

Verify with `execute_sql`: a task inserted as `done` gets `completed_at`; moving it back to `todo` clears it; `start_date > due_date` is rejected. Then run `get_advisors` (security).

### 1.2 API Layer
`src/features/tasks/api.js`:

```js
export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (params) => [...taskKeys.lists(), params],   // { spaceIds, status, priority, due, q, today }
  details: () => [...taskKeys.all, 'detail'],
  detail: (id) => [...taskKeys.details(), id],
}
const LIST_COLUMNS = 'id, space_id, title, status, priority, start_date, due_date, completed_at, external_url, position, pinned_at, created_at, updated_at'
```

| Function / hook | Details |
|---|---|
| `fetchTasks({ spaceIds, status, priority, due, q, today, weekEnd })` | `.in('space_id', spaceIds).is('deleted_at', null).order('position')`. `status`/`priority` arrays → `.in()`. `due`: `overdue` → `due_date < today` and status not in done/cancelled; `today` → `= today`; `week` → `between today and weekEnd`; `none` → `is null`. `q` → `.ilike('title', %q%)` (escape `%` and `_`). When `status` is empty, closed tasks are windowed: `.or('status.not.in.(done,cancelled),updated_at.gte.<today − DONE_WINDOW_DAYS>')`. |
| `createTask(values)` | If `values.position` is missing, reads the space's max position (`order desc limit 1 maybeSingle`) and uses `positionAfterLast`. Insert, `.select(LIST_COLUMNS).single()`. |
| `updateTask(id, patch)` | returns the row (`LIST_COLUMNS`) |
| `softDeleteTask(id)` / `restoreTask(id)` | `deleted_at` = now ISO / null |
| `useTasks(params)` | `taskKeys.list(params)`, `enabled: params.spaceIds?.length > 0`, `placeholderData: keepPreviousData` so filter changes don't flash skeletons |
| `useCreateTask()` | invalidates `taskKeys.lists()` |
| `useUpdateTask()` | full edits from the dialog; invalidates `lists()`, `setQueryData(detail(row.id))` |
| `useQuickUpdateTask()` | **optimistic** (patterns §3) for `{ id, patch }` where patch is `status`, `priority` or `due_date`; rollback on error; `onSettled` invalidates `lists()` (picks up `completed_at`) |
| `useDeleteTask()` / `useRestoreTask()` | invalidate `taskKeys.all` |

`dates` param: the page computes `today = toISODate(new Date())` and `weekEnd` from `usePreferences().weekStartsOn`, and passes both, so the query key changes at midnight on the next render.

### 1.3 Components

```
src/features/tasks/
├── api.js
├── constants.js                 # TASK_STATUSES, TASK_STATUS_MAP, TASK_PRIORITIES, TASK_PRIORITY_MAP, DUE_FILTERS, CLOSED_STATUSES, DONE_WINDOW_DAYS = 30
├── schemas.js                   # taskSchema
├── utils.js                     # groupTasksByStatus(tasks), weekEndISO(today, weekStartsOn), sortByPosition
├── hooks/useTaskFilters.js      # URL state (patterns §9): view, status[], priority[], due, q, tag[] (tag used in Phase 3)
├── components/
│   ├── TaskToolbar.jsx          # search input (debounced 250ms → q, replace), StatusFilter, PriorityFilter, DueFilter, Clear
│   ├── FacetFilter.jsx          # generic multi-select Popover+Command with counts: ({ label, options, value, onChange })
│   ├── TaskList.jsx             # groups + states
│   ├── TaskGroup.jsx            # collapsible header (icon, label, count, chevron) + AnimatedList of TaskRow
│   ├── TaskRow.jsx
│   ├── TaskStatusIcon.jsx       # ({ status, className }) — reused by 05 and 07
│   ├── TaskPriorityIcon.jsx     # ({ priority, className }) with Tooltip
│   ├── StatusPopover.jsx        # ({ status, onChange, children }) Popover + Command, keyboard 1–6
│   ├── TaskDialog.jsx           # create/edit
│   └── TaskListSkeleton.jsx
└── pages/TasksPage.jsx          # /s/:slug/tasks
src/components/shared/
├── DatePicker.jsx               # ({ value: 'yyyy-MM-dd'|null, onChange, placeholder, clearable, align }) Popover + Calendar + quick picks Today/Tomorrow/Next week
├── DatePickerField.jsx          # RHF wrapper: ({ control, name, label, placeholder })
└── SpacePickerField.jsx         # ({ control, name, label = 'Space' }) Select of activeSpaces with SpaceIcon (only if not built in 03)
```

**`constants.js`**
- `TASK_STATUSES` in this order, each `{ value, label, icon, tone }` (icons from lucide; `tone` is a placeholder key for the design system):
  `todo` "To do" `Circle` · `in_progress` "In progress" `CircleDashed` · `in_review` "In review" `CircleDot` · `blocked` "Blocked" `CircleSlash` · `done` "Done" `CircleCheck` · `cancelled` "Cancelled" `CircleX`.
- `TASK_PRIORITIES` `{ value, label, icon, rank }`: `none` "No priority" `Minus` 0 · `low` `SignalLow` 1 · `medium` `SignalMedium` 2 · `high` `SignalHigh` 3 · `urgent` `OctagonAlert` 4.
- `DUE_FILTERS`: `overdue` "Overdue", `today` "Due today", `week` "This week", `none` "No due date".
- The value lists mirror the DB check constraints exactly.

**`schemas.js`**: `taskSchema` = `title` trimmed 1–300; `status` and `priority` enums from constants; `start_date`, `due_date` nullable `yyyy-MM-dd`; refine `start_date <= due_date` (error on `due_date`: "Due date is before the start date"); `external_url` empty → null, else `z.string().url()`; `space_id` uuid.

**`TasksPage`**
- `usePageHeader({ title: 'Tasks', actions: <Button>New task</Button> })`. In Global the header shows "All spaces".
- Reads filters from `useTaskFilters()`, calls `useTasks({ spaceIds: scopeSpaceIds, ...filters, today, weekEnd })`, renders `TaskToolbar` + `TaskList`, owns the `TaskDialog` open state (`editing` task or `null`).
- Wrapped in `PageTransition`.

**`TaskList`** `({ tasks, isLoading, error, refetch, hasFilters, onEdit, onCreate })`
- Loading: `TaskListSkeleton` (3 group headers × 4 rows). Error: `ErrorState` with `refetch`.
- Empty and no filters: `EmptyState icon={ListTodo} title="No tasks yet" description="Track work with a status, priority and due date." action="Create your first task"`. Empty with filters: "No tasks match these filters" with a Clear filters action.
- Groups follow `TASK_STATUSES` order; groups with zero tasks are hidden unless that status is explicitly filtered. Collapsed state: `useLocalStorage('axon:tasks:collapsed', ['done','cancelled'])`.
- When `done`/`cancelled` are windowed, the Done group footer shows "Showing the last 30 days · Show all" (sets `status=done`).

**`TaskRow`** `({ task, showSpace, onEdit })`
- Left to right: `StatusPopover` wrapping a `TaskStatusIcon` button (`aria-label="Change status"`) → `useQuickUpdateTask`; `TaskPriorityIcon` (click opens a DropdownMenu to change priority, same optimistic hook); title as a `<button>` that calls `onEdit(task)`; due label via `formatDueLabel(task.due_date)` in `text-destructive` when `isOverdue` and not closed; `SpaceBadge` when `showSpace`; external link icon button (`<a target="_blank" rel="noopener noreferrer">`, `aria-label="Open link"`, Tooltip showing the host); a row DropdownMenu (Edit, Open link, Delete).
- Closed tasks: title `text-muted-foreground line-through`.
- Delete: `useDeleteTask` then `toast('Task moved to Trash', { action: { label: 'Undo', onClick: restore } })`.
- Motion: rows are `AnimatedList` items (`listItem`, `layout`), so a status change animates the row into its new group. No animation on first paint.

**`TaskDialog`** `({ open, onOpenChange, task, initialValues, onSuccess })`
- Fields: title (autofocus), status Select, priority Select, start and due `DatePickerField`s side by side, external URL, and `SpacePickerField` only when `isGlobal`. No description field (edited on the detail page, Feature 07).
- `initialValues` prefills a **create** (for example `{ status }` from board quick-add in Global, or `{ title, space_id }` from inbox triage in Feature 13); it is ignored when `task` is set. Default `space_id`: `initialValues.space_id ?? space?.id ?? profile.last_space_id (if active) ?? activeSpaces[0].id`.
- `onSuccess(row)` is called with the saved row after the dialog's own success handling (closing, toast), so callers can chain work (linking, marking an inbox item processed).
- **Mountable standalone:** the dialog depends only on `useSpace()`, its own hooks and props, never on `TasksPage` state. Feature 12's `GlobalDialogs` (in `AppLayout`) opens it from `?new=task`.
- `form.reset()` when `open`, `task` or `initialValues` changes; Ctrl/Cmd+Enter submits; the submit button shows `isPending`; closes in the mutation's `onSuccess`. Toast "Task created" only on create.

### 1.4 Routes and Integration
- `router.jsx`: `tasks` renders the real `TasksPage` (replaces the placeholder file). `tasks/:taskId` stays a placeholder until Feature 07.
- No sidebar change (the Tasks nav item exists from 03).

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 01 `lib/dates.js` | `weekEndISO` needs week start | Keep it in `features/tasks/utils.js`; lift to `lib/dates.js` when a second feature needs it |
| 03 shared components | `SpacePickerField` may not exist | Create it here and record it in the changelog |
| 03 SpaceCard | Task counts become possible | Not now (03's "counts later" note stands) |

### 1.6 Not in This Phase
- Board view (Phase 2); tags and tag filter (Phase 3)
- Description, detail page, activity log (07); checklist (05)
- Pin and unpin UI (14); recurring tasks (16); bulk actions and multi-select (backlog)

### 1.7 Checklist: Before Marking Complete
- [x] `create_tasks` is applied (`20260923181804`) and mirrored. Verified in a rolled-back transaction:
  - Setting done stamps `completed_at`, and reopening clears it.
  - Start after due is rejected.
  - A task can't be put in another user's space (composite FK).
  - RLS isolates users.
  - Advisors show nothing new from the migration.
- [x] **Grid (default):** cards with a status pill, priority pill, MR chip, menu, description preview, and a space and due footer.
- [x] **List:** status groups in order, which collapse with counts; the collapsed state persists.
- [x] Tabs All / Tasks / In progress / Completed have live counts, and the tab is in the URL (tests)
- [x] Create and edit work through the Linear-style dialog. The space chip is always editable. Create more keeps the dialog open (test).
- [x] `TaskDialog` accepts `initialValues` and `onSuccess(row)`, and depends only on SpaceContext, so it mounts standalone (verified by construction; a `GlobalDialogs` mount comes in Feature 12)
- [x] `restoreTask` / `useRestoreTask` are exported
- [x] Status and priority changes from cards and rows are optimistic, and roll back with an error toast (test for the save)
- [x] Filters (status, priority, due, search, tab, view) live in the URL; reload restores them; Clear resets. The view is also remembered per device (test).
- [x] Due filters run on the server for overdue, today, this week (per the week-start preference) and none. Closed tasks are windowed to 30 days except on the Completed tab.
- [x] Delete shows the Undo toast, and Undo restores the task (test)
- [x] Loading (card or row skeletons), error, first-run empty and filtered-empty states render
- [x] Tests: `groupTasksByStatus`, `weekEndISO` (both week starts), `filterTasks` / `tabCounts`, `textToDoc`, `linkHost`, `taskSchema`, plus 8 page tests
- [x] `npm run lint`, `npm test` (165 tests) and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` DB registry, status and changelog are updated; `axon-data-patterns.md` §10 lists the new shared components

### Implementation Notes (Phase 1)
- **The design fold above replaced the list-first plan.** The grid is the default, the list is the dense option, and the board is still Phase 2. Todos get their own page in 05 (the G1 merge was reversed on 2026-09-24).
- **Filtering is split** between server and client:
  - The server handles priority, due window, search and the closed-task window.
  - The client handles the tab and status filter, over the same result. This keeps every tab count live without extra queries, which is fine at personal scale.
  - `allClosed` turns off the 30-day window on the Completed tab, or when a closed status is filtered.
- **The description** is a plain textarea (`field-sizing-content`). It saves as `description_text`, plus a one-paragraph-per-line Tiptap doc in `description`, ready for the rich editor in 07.
- **Shared components added** to `components/shared`:
  - `TintPill` / `DotPill`: the status and priority recipes.
  - `DueLabel`: tones plus "Completed 18 Sep".
  - `PropertyChip`, `HeaderAlert`, `DatePicker` (quick chips plus the shadcn Calendar, with week start from preferences) and `SpaceChipPicker`.
  - `SpacePickerField` / `DatePickerField` weren't needed: the chips replace them.
- **Tasks feature pieces:**
  - `TaskPills` (status/priority pills and icons), `TaskMenus` (StatusMenu, PriorityMenu, TaskActionsMenu), `TaskCard`, `TaskRow`, `TaskViews` (TaskGrid, TaskList), `TaskTabs` (a sliding underline), `TaskToolbar` and `TasksSkeleton`.
  - The hooks `useTaskFilters` and `useTaskActions` (optimistic set and delete with Undo).
- **The header alert** "N overdue · Review" appears when any task is overdue and applies `due=overdue`.
- **Advisor note:** Supabase now reports `auth_leaked_password_protection`, an Auth setting. The user can enable it under Auth → Providers → Email → Leaked password protection (Pro plan feature).

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Board View ✅ Complete

### Design fold (delta 04/05 board items and screen 04c, folded on 2026-09-24). This overrides the spec below where they differ.
- **Five columns:** To do, In progress, In review, Blocked, Completed. **Cancelled is never shown on the board.** The tab and status filter narrow which columns show.
- **The view switch** is the existing toolbar `SegmentedControl`, now Grid · Board · List (lucide `Columns3`). No separate `ViewToggle` component.
- **Columns** are 270px `bg-muted` wells (16px radius, 10px padding, 10px gap). The header has the filled status pill, a count and a `+` button; the footer has "+ Add task". The column under a dragged card gets an accent border.
- **Board cards** (04c): a priority pill and an MR icon on top, the title (14/600), then a dashed footer with the space (Global only) on the left and the due label on the right. The `⋮` menu shows on hover.
- **Drag:** the lifted card is scale 1.01, rotate 1°, `shadow-md`, grabbing cursor (design-system.md → Kanban drag). The drop slot is a **dashed accent box** with the soft accent fill.
- **Loading:** five skeleton columns.

### Goal
The user toggles List / Board (`?view=board`). The board shows one column per status with counts. Cards drag within and across columns; a drop updates status and position instantly and persists. Each column has a quick-add at the bottom. Dragging is fully keyboard accessible.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check the installed `@dnd-kit/core` and `@dnd-kit/sortable` versions and their current APIs: `DndContext`, `DragOverlay`, `useSortable`, `verticalListSortingStrategy`, `KeyboardSensor` with `sortableKeyboardCoordinates`, `useDroppable`, and the `accessibility.announcements` prop. Do not switch to the `@dnd-kit/react` rewrite.
3. `lib/position.js` exports `positionBetween` and `needsRebalance` with tests.

### 2.1 Database
No database changes in this phase.

### 2.2 API Layer
Additions to `src/features/tasks/api.js`:

| Function / hook | Details |
|---|---|
| `useMoveTask()` | `mutationFn: ({ id, status, position }) => updateTask(id, { status, position })`. **Optimistic** on every `taskKeys.lists()` query; rollback and toast on error; `onSettled` invalidates `lists()` |
| `rebalanceTasks(orderedIds)` | sets `position = (i + 1) * 1000` for each id with `Promise.all` of `updateTask`; called by the board after a move when `needsRebalance` is true for the new neighbours |

### 2.3 Components

```
src/features/tasks/components/
├── ViewToggle.jsx               # ToggleGroup List | Board → setFilter('view')
├── TaskBoard.jsx                # DndContext, sensors, DragOverlay, announcements, move logic
├── BoardColumn.jsx              # ({ status, tasks, onQuickAdd }) header (icon, label, count) + SortableContext + useDroppable
├── BoardCard.jsx                # ({ task, showSpace, overlay }) useSortable; title, priority, due label, SpaceBadge, link icon
├── ColumnQuickAdd.jsx           # "+ Add task" → inline input; Enter creates, Esc closes
└── TaskBoardSkeleton.jsx
```

- **Sensors:** `PointerSensor` (activation distance 6px, so clicks still open the card), `KeyboardSensor` with `sortableKeyboardCoordinates`. Screen-reader announcements read "Picked up {title}", "Moved to {column}, position {n}", "Dropped in {column}".
- **Move logic** (`TaskBoard`): local column state mirrors the query data; `onDragOver` moves the item between columns in local state; `onDragEnd` computes `position = positionBetween(prev?.position, next?.position)` from its new neighbours and calls `useMoveTask` with the column's status. A same-column, same-index drop does nothing.
- **Filters:** priority, due and search apply. The status filter selects which columns are visible (all six when empty). The closed-task window from Phase 1 applies to the Done and Cancelled columns.
- **Quick-add:** in a space, creates `{ title, status: column, position: positionAfterLast(column) }` via `useCreateTask`. In Global it opens `TaskDialog` with `initialValues={{ status }}` instead, because a space must be picked.
- **Click** on a card opens `TaskDialog` (edit); in Feature 07 it navigates to the detail page.
- **Motion:** `DragOverlay` renders a lifted `BoardCard overlay` (scale via `springSnappy`); cards use `layout` so the drop settles smoothly. Horizontal scroll on narrow widths; columns keep a fixed min width via semantic spacing tokens.
- **States:** skeleton columns while loading; `ErrorState`; the page-level `EmptyState` when there are no tasks at all (empty columns still render with their quick-add).
- `ViewToggle` sits in `TaskToolbar`; the last view is also remembered in `useLocalStorage('axon:tasks:view')` and used when the URL has no `view`.

### 2.4 Routes and Integration
- `TasksPage` renders `TaskBoard` when `filters.view === 'board'`, else `TaskList`.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 Phase 1 list | Shares filters and position | List order stays `position`, so board order and list order agree |

### 2.6 Not in This Phase
- Swimlanes (by priority or space), WIP limits, custom columns: backlog
- Dragging between list groups: list stays status-grouped via the status popover

### 2.7 Checklist: Before Marking Complete
- [x] `?view=board` renders **five** columns (Cancelled hidden, per the design fold) with counts; the toggle round-trips with the grid and list (test). The tab and status filter narrow the columns (test).
- [x] Dragging within a column reorders it, and dragging across columns changes status. Both save `{ status, position }` through `useMoveTask` (hook test). `completed_at` comes from the existing trigger. **Browser check pending:** jsdom has no layout, so real pointer drags and persistence after reload are for the user to confirm.
- [x] A failed move rolls the card back and shows an error toast (hook test)
- [x] Keyboard: Space picks up, the arrow keys move, Space/Enter drops, Esc cancels, and Enter on a resting card opens it. Announcements and screen-reader instructions are wired. **Browser check pending** (same jsdom limit).
- [x] Quick-add creates at the bottom of the column in a space and stays open for the next title (test); in Global it opens `TaskDialog` with `initialValues={{ status }}`
- [x] Rebalance runs when neighbours are closer than `1e-9` or equal: `planBoardMove` unit tests, and a hook test for `rebalanceIds`
- [x] `npm run lint`, `npm test` (178 tests) and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files (tooltips were added to the icon-only column `+` and the MR link)
- [x] `00-index.md` status and changelog are updated

### Implementation Notes (Phase 2)
- **Files:** `TaskBoard` (DndContext, sensors, move logic, announcements, overlay), `BoardColumn` (a droppable well, SortableContext and a private `ColumnQuickAdd`), `BoardCard` (the card plus `SortableBoardCard`), and a board branch in `TasksSkeleton`. There's no `ViewToggle`: the toolbar's `SegmentedControl` gained Board. `TaskBoardSkeleton` also became a branch in `TasksSkeleton`.
- **`useMoveTask`** shares one private `useOptimisticPatch` with `useQuickUpdateTask`. It takes `{ id, patch, rebalanceIds }` and renumbers the column after the move when `planBoardMove` says so. `rebalanceTasks(orderedIds)` is exported.
- **No flicker on drop:** the board keeps its local column order after the drop until the `tasks` prop changes (the optimistic update), then goes back to deriving from props.
- **The drop slot keeps the card's height,** not the design's fixed 96px. The lifted card's own node becomes the dashed accent slot, so dnd-kit's sort offsets stay correct. A fixed height made the other cards shift by the wrong amount.
- **The Done column** shows "Last 30 days · Show all" while the closed-task window applies. Show all switches to the Completed tab.
- **Empty states:** the page shows the first-run empty state only when there are no tasks at all. Filtered-empty boards still render their columns, so quick-add stays available.
- **Keyboard codes:** Space starts a drag (not Enter), so Enter can open the card.
- **Controls inside a card** (the MR link and the menu) stop pointer and key events, so they never start a drag.

**Stop here. Show the result and wait for approval.**

---

## Phase 3: Tags ✅ Complete

### Goal
The user can create tags inline while tagging a task, see tag pills on rows and cards, filter tasks by tag, and manage tags (rename, recolour, delete, and change scope between one space and all spaces). Tags are shared with notes in Feature 06.

### Before Starting: Confirm Phase 2 Is Approved (all confirmed on 2026-09-24)
1. Phase 2 is `✅ Complete`.
2. The double-aliased embed (`tag_ids:task_tags(tag_id)` plus a filtered `tag_match:task_tags!inner(tag_id)`) **works**, confirmed with an anonymous request against the live schema (RLS returned zero rows, but the query parsed and ran).
3. The `or` filter syntax for `space_id.is.null,space_id.in.(…)` works as documented.
4. **Deviation:** the design system was finalised by the time this phase was built, so `TAG_COLORS` reuses `HUE_KEYS` from `lib/tint.js` directly (the same list `SPACE_COLORS` uses) instead of a separate placeholder.

### 3.1 Database
Migration `create_tags_and_task_tags`:

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
create trigger tags_updated_at before update on public.tags
  for each row execute function public.set_updated_at();
alter table public.tags enable row level security;
create policy "tags_owner_all" on public.tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

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
alter table public.task_tags enable row level security;
create policy "task_tags_owner_all" on public.task_tags for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

Verify: a duplicate name (case-insensitive) in the same scope is rejected; the same name in a space and globally is allowed; deleting a tag removes its `task_tags`. Run advisors.

### 3.2 API Layer
`src/features/tags/api.js`:

```js
export const tagKeys = {
  all: ['tags'],
  lists: () => [...tagKeys.all, 'list'],
  list: (params) => [...tagKeys.lists(), params],   // { spaceIds }
}
```

| Function / hook | Details |
|---|---|
| `fetchTags({ spaceIds })` / `useTags({ spaceIds })` | `select('id, space_id, name, color, task_tags(count)')`, `.or('space_id.is.null,space_id.in.(ids)')`, order `name`. Returns global tags plus tags of those spaces. `enabled: spaceIds?.length > 0` |
| `createTag({ name, color, space_id })` / `useCreateTag()` | returns the row; maps error `23505` to "A tag with this name already exists"; invalidates `tagKeys.all` |
| `updateTag(id, patch)` / `useUpdateTag()` | rename, recolour, scope; invalidates `tagKeys.all` and `taskKeys.lists()` |
| `deleteTag(id)` / `useDeleteTag()` | **hard delete** (tags are not soft-deleted); invalidates `tagKeys.all` and `taskKeys.all` |

Additions to `src/features/tasks/api.js`:
- `LIST_COLUMNS` gains `tag_ids:task_tags(tag_id)`; the fetch maps it to `tag_ids: string[]`. `fetchTasks` accepts `tag` (ids, any-of) using the `tag_match` inner alias. `fetchTask` reads include tags when added in 07.
- `setTaskTags(taskId, tagIds)`: delete rows for this task where `tag_id not in tagIds`, then `upsert` the rest with `{ onConflict: 'task_id,tag_id', ignoreDuplicates: true }`. `useSetTaskTags()` invalidates `taskKeys.lists()` and `tagKeys.all` (counts).

### 3.3 Components

```
src/features/tags/
├── api.js
└── constants.js                 # TAG_COLORS (placeholder keys)
src/components/shared/
├── TagPill.jsx                  # ({ tag, size = 'sm', onRemove }) data-color={tag.color}; remove button has aria-label
├── TagPicker.jsx
└── ManageTagsDialog.jsx
```

**`TagPicker`** `({ value: string[], onChange, spaceIds, createSpaceId, mode = 'assign', trigger })`
- Popover + Command multi-select over `useTags({ spaceIds })`, showing a check, the colour dot and a scope hint ("All spaces" or the space name in Global).
- Typing a name with no exact match offers "Create tag '…'" (only when `createSpaceId !== undefined`; `null` creates a global tag). The new tag is selected immediately.
- `mode="filter"` hides create and shows "Clear".
- Footer: "Manage tags…" opens `ManageTagsDialog`.

**`ManageTagsDialog`** `({ open, onOpenChange, spaceIds })`
- One row per tag: inline rename input (saves on blur or Enter), colour swatch popover (`TAG_COLORS`), scope Select ("All spaces" or one active space), usage count, delete.
- Narrowing a tag's scope to one space while it is used elsewhere shows an inline warning ("Items in other spaces keep this tag, but it can't be added there").
- Delete uses `ConfirmDialog` ("Delete 'frontend'? It will be removed from 12 tasks.").
- Empty state: "No tags yet. Create one from any tag picker."

**Integration in tasks**
- `TaskDialog` gains a Tags field: `TagPicker` with `spaceIds=[watch('space_id')]` and `createSpaceId=watch('space_id')`. On submit, the dialog saves the task, then calls `setTaskTags`. Changing the space in Global drops tags that are scoped to another space.
- `TaskRow` and `BoardCard` show up to 3 `TagPill`s plus "+n", resolving `tag_ids` through a `Map` built once per list from `useTags({ spaceIds: scopeSpaceIds })`.
- `TaskToolbar` gains a Tags filter: `TagPicker mode="filter"` → `setFilter('tag', ids)`.

### 3.4 Routes and Integration
None beyond the component changes above.

### 3.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 Phase 1–2 | List select and filters change | Update `LIST_COLUMNS`, `fetchTasks`, `useTaskFilters` (`tag`) |
| 03 delete space | Space-scoped tags cascade | Already covered by `qc.invalidateQueries()` in `useDeleteSpace` |
| 06 notes (future) | Shares tags | 06 adds `note_tags` and `note_tags(count)` to the tag select |

### 3.6 Not in This Phase
- Tag hierarchy or groups, tag pages: backlog
- Note tags (06)

### 3.7 Checklist: Before Marking Complete
- [x] `create_tags_and_task_tags` is applied (`20260924063708`) and mirrored. Verified in a rolled-back transaction:
  - A duplicate name (case-insensitive) in the same scope is rejected.
  - The same name in a space and globally is allowed.
  - Deleting a tag cascades its `task_tags`.
  - Advisors show nothing new from the migration.
- [x] Creating a tag inline from `TaskDialog` works and selects it; duplicates show the friendly error (tests)
- [x] A space tag is not offered in another space; a global tag is offered everywhere (test)
- [x] Row and card pills render (`TagPillGroup`, up to 3 + "+n"); the tag filter lives in the URL and keeps all pills visible on filtered rows (the double-alias embed)
- [x] Rename, recolour, scope change and delete work from `ManageTagsDialog`; delete confirms with the usage count (tests)
- [x] `npm run lint`, `npm test` (188 tests) and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files. Two should-fix items were applied (a Tooltip on `ManageTagsDialog`'s icon-only colour swatch and delete button; `TaskDialog`'s chip sub-components were split into `TaskDialogChips.jsx` to stay under the 200-line guideline).
- [x] `00-index.md` DB registry, status and changelog are updated; `axon-data-patterns.md` §10 lists `TagPicker`, `TagPill` (and `TagPillGroup`), `ManageTagsDialog`

### Implementation Notes (Phase 3)
- **`setTaskTags` / `useSetTaskTags` live in `features/tags/api.js`,** not `features/tasks/api.js` as planned. `tags/api.js` already imports `taskKeys` from `tasks/api.js` to invalidate task lists after a tag edit; putting `setTaskTags` in `tasks/api.js` too would have made the two `api.js` modules import each other. Everything else (the SQL, the components, the integration points) matches the plan.
- **`TagsChip`, `DateChip` and `LinkChip`** moved out of `TaskDialog.jsx` into `TaskDialogChips.jsx` (a should-fix from the rules audit, not planned up front).
- **Tag pills also appear on the grid `TaskCard`,** not just `TaskRow` and `BoardCard`. The design (G2) shows tags on cards too; the Phase 3 plan's component list just didn't call it out.
- **Radix `asChild` gotcha:** `TagPicker`'s default trigger button didn't forward the props Radix's `PopoverTrigger asChild` clones onto it (`onClick`, `aria-expanded`, `ref`, …), so the popover silently never opened. Fixed by forwarding `ref` and spreading `...props`. Worth remembering for any future custom trigger component.
- **Changing the space in Global** drops tag ids that are scoped to a different space, via a small effect in `TaskForm` that compares the previous and current `space_id` (not a fetch, and not deriving render state — it prunes local selection state in response to a value change).
- **Tag pill shape:** the design file's actual board-card tags use a 5px radius (`--radius-sm`), the same as `SpaceBadge`, not the 6px `design-system.md` said. Corrected the doc to match the source design; see its changelog note.

**Stop here. Show the result and wait for approval.**

---

## Data Model Summary (after all phases)

```
spaces 1 ── n tasks
tasks  n ── n tags   (via task_tags)
tags.space_id NULL ⇒ available in every space
```

### `tasks`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK; `unique(id, user_id)` |
| `space_id` | uuid | composite FK to spaces, cascade |
| `title` | text | 1–300 |
| `description` / `description_text` | jsonb / text | edited from 07 |
| `status` | text | todo, in_progress, in_review, blocked, done, cancelled |
| `priority` | text | none, low, medium, high, urgent |
| `start_date` / `due_date` | date | start ≤ due |
| `completed_at` | timestamptz | trigger-maintained |
| `external_url` | text | MR / Jira link |
| `position` | double | fractional ordering |
| `pinned_at` | timestamptz | UI in 14 |
| `deleted_at` | timestamptz | soft delete |
| `search` | tsvector | generated; used from 12 |

### `tags`
| Column | Type | Notes |
|---|---|---|
| `space_id` | uuid | NULL = all spaces |
| `name` | text | 1–40; unique per scope, case-insensitive |
| `color` | text | colour key |

### `task_tags`
| Column | Type | Notes |
|---|---|---|
| `task_id`, `tag_id` | uuid | PK pair; composite FKs, cascade |

## Out of Scope (All Phases)
- Description, detail page, activity log: Feature 07
- Checklist items: Feature 05
- Recurring tasks: Feature 16
- Pins UI: Feature 14
- Assignees, estimates, sprints: never (single-user) or backlog
