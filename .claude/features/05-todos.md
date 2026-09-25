# Feature 05: Todos (Quick Checklist)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/05-todos.md`
**Status**: ✅ Complete
**Depends on**: 04
**Last Updated**: September 2026

---

## Context

A todo is a quick checkbox: "reply to Priya", "bump the design-tokens package". It is lighter than a task (no status, priority or description) and either stands alone or sits on a task as a checklist item (`todos.task_id`). This feature gives todos their own page, grouped by when they are due, and builds the reusable `TodoChecklist` that Feature 07 mounts on the task detail page. It follows the `api.js` pattern from Feature 04 and relies on two DB triggers: one keeps `done_at` and a checklist item's space in sync, and one cascades task space moves and soft deletes to checklist items.

---

## Phase Overview

```
Phase 1: Todos page
  todos table + triggers, api.js, /todos grouped Overdue / Today / Upcoming / Someday + Done, inline add, toggle, edit, reorder, delete + Undo.

Phase 2: Task checklists
  Reusable TodoChecklist (add, toggle, reorder, progress), checklist progress badges on task rows and board cards.
```

**After each phase, stop and wait for approval.**

---

## Phase 1: Todos Page

### Goal
At `/s/:slug/todos` the user types a todo into an always-visible input at the top and presses Enter to add it, optionally picking a due date from a small popover (a `TodoDialog` covers creates from elsewhere and fuller edits). Todos appear grouped as Overdue, Today, Upcoming and Someday (no date), with a collapsible Done group for the last 7 days. Checking a todo plays a satisfying micro-interaction and moves it to Done. Titles are edited inline, due dates changed from the chip, todos reordered by drag within a group, and deleted with Undo. Checklist todos (from tasks) show a "↳ task" chip. In Global each todo shows its space badge.

### Design fold (folded on 2026-09-24)
- A standalone `Todos.dc.html` design file exists in the design folder (predating the G1 merge into Tasks, not wired into `screens.json`, but a real design). It matches this doc closely: title + "N open" subtitle, a pinned "Add a todo…" input with a "today · ↵" hint, groups coloured by urgency (Overdue destructive, Today foreground, Upcoming/Someday muted) with a mono count, rows with a 17px rounded-6px checkbox that scales 1.08 and fills solid on check, a strike-through title, a muted "↳ task" chip (icon `corner-down-right`), and a mono due label on the right. Page: max-width 680, centred, 40px padding — **adopted as-is**.
- Its header has a "Show done" switch instead of a collapsible Done section. **Superseded:** this doc's own collapsible-Done-group design (7-day window, `useLocalStorage`) is more complete and is kept; the switch's intent is already served by that.

### Before Starting: Confirm With Codebase (confirmed on 2026-09-24)
1. Feature 04 Phase 3 is complete: `tasks` exists; `taskKeys`, `useDeleteTask`, `useRestoreTask`, `useUpdateTask` exist; `DatePicker`, `SpaceBadge`, `AnimatedList` and `lib/position.js` exist.
2. shadcn's `checkbox.jsx` wraps Radix `Checkbox.Root`/`Indicator`, styled with `data-checked` (not the classic `data-[state=checked]`) and no built-in scale/draw motion. Building a custom `AnimatedCheckbox` (a `<button role="checkbox" aria-checked>`, motion-wrapped) matches the design's look (a 17px, 6px-radius, filled-on-check box) more directly than restyling the primitive, and is simpler to animate. Built that way.
3. `@dnd-kit/modifiers` was missing; installed (`^9.0.0`). `restrictToVerticalAxis` and `restrictToParentElement` exist.
4. The `task:tasks(id, title, status)` embed is confirmed against the live schema once `todos` exists (below), the same way Phase 3's double-alias embed was checked.
5. Confirmed via the Supabase Management API fallback (the MCP tools aren't loaded this session; see `supabase.md`): `public.todos` does not exist.

### 1.1 Database
Migration `create_todos`: the SQL from `data-model.md` **todos**, including both triggers.

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

create trigger todos_updated_at before update on public.todos
  for each row execute function public.set_updated_at();

alter table public.todos enable row level security;
create policy "todos_owner_all" on public.todos for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
```

Verify with `execute_sql`:
- Toggling `is_done` sets and clears `done_at`.
- A checklist todo inserted with the wrong `space_id` takes the task's space.
- Moving the task to another space moves its todos.
- Soft-deleting the task stamps the same `deleted_at` on its open todos; a todo deleted earlier keeps its own timestamp; restoring the task restores only the cascaded set.

Then run advisors.

### 1.2 API Layer
`src/features/todos/api.js`:

```js
export const todoKeys = {
  all: ['todos'],
  lists: () => [...todoKeys.all, 'list'],
  list: (params) => [...todoKeys.lists(), params],   // { spaceIds, taskId, includeDone, doneSince, checklist }
  progress: (params) => [...todoKeys.all, 'progress', params],   // Phase 2
}
const COLUMNS = 'id, space_id, task_id, title, is_done, done_at, due_date, position, created_at, task:tasks(id, title, status)'
```

| Function / hook | Details |
|---|---|
| `fetchTodos({ spaceIds, taskId, includeDone, doneSince, checklist })` | `.is('deleted_at', null).order('position')`. With `taskId`: `.eq('task_id', taskId)` (no space filter; all items). Otherwise `.in('space_id', spaceIds)`; `includeDone` → `.or('is_done.eq.false,done_at.gte.<doneSince>')`, else `.eq('is_done', false)`; `checklist === 'hide'` → `.is('task_id', null)` |
| `useTodos({ spaceIds, taskId, includeDone = true, checklist })` | computes `doneSince` = start of day 7 days ago (ISO) inside the hook; `enabled: !!taskId \|\| spaceIds?.length > 0` |
| `createTodo(values)` / `useCreateTodo()` | `{ space_id, task_id?, title, due_date?, position? }`; missing position → max position in scope + 1000 (as `createTask`). Invalidates `todoKeys.all` |
| `updateTodo(id, patch)` / `useUpdateTodo()` | title and due date edits; invalidates `todoKeys.all` |
| `useToggleTodo()` | `({ id, is_done })`; **optimistic** on every `todoKeys.lists()` query (sets `is_done`, and `done_at` to now or null locally); rollback + toast; `onSettled` invalidates `todoKeys.all` |
| `useReorderTodo()` | `({ id, position })`; **optimistic**; `onSettled` invalidates `lists()` |
| `softDeleteTodo(id)` / `restoreTodo(id)`, `useDeleteTodo()` / `useRestoreTodo()` | invalidate `todoKeys.all` |

`src/features/todos/utils.js` (tested):
- `groupTodos(todos, today)` → `{ overdue, today, upcoming, someday, done }`. Open todos go by `due_date` vs `today` (`yyyy-MM-dd` string compare). `done` is sorted by `done_at` desc; the others by `position`.
- `TODO_GROUPS` metadata (`key`, `label`, `icon`, `emptyHint`) lives in `constants.js`.

### 1.3 Components

```
src/features/todos/
├── api.js
├── constants.js                 # TODO_GROUPS, DONE_WINDOW_DAYS = 7
├── schemas.js                   # todoTitleSchema (trimmed 1–500), todoSchema (title, due_date, space_id)
├── utils.js
├── hooks/useTodoFilters.js      # URL: checklist = 'all' | 'hide', highlight = <todo id>
├── hooks/useHighlightTodo.js    # scroll-to + flash for ?highlight=<id>
├── components/
│   ├── AddTodoInput.jsx
│   ├── TodoDialog.jsx           # create/edit: title, due date, space (Global only)
│   ├── TodoGroup.jsx            # ({ group, todos, collapsible, defaultCollapsed, sortable }) header + count + list
│   ├── SortableTodoList.jsx     # DndContext + SortableContext for one group
│   ├── TodoItem.jsx
│   ├── AnimatedCheckbox.jsx     # ({ checked, onCheckedChange, label })
│   ├── TodoDueChip.jsx          # ({ date, onChange }) DatePicker trigger showing formatDueLabel
│   ├── TaskChip.jsx             # ({ task, spaceSlug }) "↳ {title}" Link to the task route
│   └── TodoListSkeleton.jsx
└── pages/TodosPage.jsx          # /s/:slug/todos
```

**`TodosPage`**
- `usePageHeader({ title: 'Todos', actions: <ChecklistToggle/> })`, where the toggle is a small switch "Show task checklist items" bound to `useTodoFilters().checklist`.
- `useTodos({ spaceIds: scopeSpaceIds, includeDone: true, checklist })`, then `groupTodos(data, toISODate(new Date()))`.
- Renders `AddTodoInput`, then Overdue, Today, Upcoming and Someday (a group is hidden when empty, except Today, which shows its hint "Nothing due today"), then Done (collapsed by default; `useLocalStorage('axon:todos:doneCollapsed', true)`).
- Loading: `TodoListSkeleton`. Error: `ErrorState`. No open or recent todos: `EmptyState icon={CheckSquare} title="Nothing to do" description="Add a todo above. Press Enter to save."` (the input stays visible above it).

**`AddTodoInput`** `({ spaceId })`
- Pinned at the top (`sticky` inside the page, semantic background). Enter creates; the input clears and keeps focus; Esc blurs. Empty or whitespace does nothing.
- A calendar icon button (`aria-label="Set due date"`) opens `DatePicker`; the chosen date shows as a chip inside the input and is reset after adding.
- In Global a compact space Select sits before the input, defaulting to `profile.last_space_id` (if active) or the first active space. Natural-language date parsing is out of scope.

**`TodoItem`** `({ todo, showSpace, dragHandleProps })`
- Drag handle (`GripVertical`, visible on hover and focus, `aria-label="Reorder"`), `AnimatedCheckbox` → `useToggleTodo`, the title, `TodoDueChip`, `TaskChip` when `todo.task_id`, `SpaceBadge` when `showSpace`, and a hover menu (Edit…, Delete). The root element carries `id="todo-<id>"` for the highlight scroll.
- Clicking the title switches to an inline input: Enter or blur saves via `useUpdateTodo`; Esc cancels; an empty value reverts.
- Done: title muted with a strike-through line animated with `scaleX` (transform only), and the due chip hidden.
- Delete: `useDeleteTodo`, then `toast('Todo deleted', { action: { label: 'Undo', onClick: restore } })`.

**`TodoDialog`** `({ open, onOpenChange, todo, initialValues, onSuccess })`
- The dialog counterpart of the inline input, for creating from elsewhere (Feature 12 command palette, Feature 13 inbox triage) and for a fuller edit from the `TodoItem` menu ("Edit…").
- Fields: title (autofocus, `todoSchema`: title trimmed 1–500, `due_date` nullable `yyyy-MM-dd`, `space_id` uuid), due `DatePickerField`, and `SpacePickerField` only when `isGlobal`. The space field is hidden for a checklist todo (its space follows the task).
- `initialValues` prefills a create; `onSuccess(row)` fires after the dialog's own success handling; follows every dialog rule (controlled, `form.reset()` on open or record change, Ctrl/Cmd+Enter, pending state, closes in `onSuccess`, toast "Todo added" on create).
- **Mountable standalone:** it depends only on `useSpace()`, its hooks and props, never on `TodosPage` state. Feature 12's `GlobalDialogs` opens it from `?new=todo`.

**Highlight (`?highlight=<id>`)**: `useHighlightTodo({ todos, highlightId })` waits until the id is in the loaded data, expands the Done group if the todo is in it, scrolls the item into view (`scrollIntoView({ block: 'center' })`, instant under reduced motion), flashes it once (an opacity pulse from presets on a background overlay), then removes the param with `replace: true`. An id that is not found clears the param silently. Used by search results (12) and inbox triage (13).

**`AnimatedCheckbox`**: the check path draws and the box pops with `springSnappy` from presets; reduced motion falls back to a fade (handled by `MotionConfig`).

**`TaskChip`**: links to `paths.space(spaceById.get(todo.space_id).slug).task(task.id)` (a checklist todo always shares its task's space). It shows `TaskStatusIcon` from `features/tasks/components`. Until Feature 07 the route is a placeholder page.

**Reorder:** one `SortableTodoList` per open group, vertical-axis modifier, `PointerSensor` (6px) and `KeyboardSensor`. On drop, `positionBetween(prev, next)` → `useReorderTodo`. Cross-group drops are not allowed; change the due date to move a todo between groups. Done is not sortable.

**Motion:** groups use `AnimatedList` (`listItem`, `layout`), so a completed todo glides into Done and a new todo animates in. No animation on first paint.

### 1.4 Routes and Integration
- `router.jsx`: `todos` renders the real `TodosPage` (replaces the placeholder).

### 1.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 `useDeleteTask` / `useRestoreTask` | The trigger soft-deletes and restores checklist todos | Also invalidate `todoKeys.all` in both hooks |
| 04 `useUpdateTask` (space change) | The trigger moves checklist todos | Invalidate `todoKeys.all` when the patch includes `space_id` |
| 04 `TaskStatusIcon` | Reused by `TaskChip` | Import from `@/features/tasks/components/TaskStatusIcon` |

### 1.6 Not in This Phase
- `TodoChecklist` and progress badges (Phase 2)
- Natural-language date suffixes ("tomorrow", "fri"): backlog
- Recurring todos and reminders (16); promoting a todo to a task (13)

### 1.7 Checklist: Before Marking Complete
- [x] `create_todos` is applied (`20260924113120`) and mirrored. Verified in a rolled-back transaction: toggling `is_done` sets/clears `done_at`; a checklist todo takes its task's `space_id` regardless of what's inserted; moving the task moves its todos; soft-deleting the task cascades to open todos, restoring reverses only that exact cascaded set (a todo deleted independently earlier stays deleted). Advisors show nothing new.
- [x] Enter adds a todo with and without a due date, in a space and in Global (space required) (tests)
- [x] Grouping is correct around midnight boundaries (unit tests for `groupTodos`)
- [x] Toggling is instant and rolls back on failure (test). Done shows the last 7 days only (`DONE_WINDOW_DAYS`, same windowing pattern as tasks)
- [x] Inline edit saves on Enter or blur and cancels on Esc (test)
- [x] Drag reorder within a group: the position maths and the optimistic mutation (with rollback) are tested; a real pointer/keyboard drag can't run in jsdom (no layout), so **please confirm in the browser**
- [x] Delete shows Undo, and Undo restores the todo; `restoreTodo` / `useRestoreTodo` are exported (test)
- [x] `TodoDialog` creates and edits (space required in Global), accepts `initialValues` and `onSuccess(row)`, and works mounted outside `TodosPage` (verified by construction, matching `TaskDialog`'s standalone pattern; test covers the create path)
- [x] `?highlight=<id>` scrolls to and flashes the todo (including one in the collapsed Done group), then clears the param (test)
- [x] Checklist todos show the "↳ task" chip; the switch hides them (test)
- [x] Deleting a task in Feature 04 removes its checklist todos from this page without a reload, and Undo brings them back (covered by `useDeleteTask`/`useRestoreTask` now invalidating `todoKeys.all`; the DB cascade itself is verified above)
- [x] `npm run lint`, `npm test` (203 tests) and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files (one dead-code cleanup: a `tabIndex={-1}` on the drag handle that dnd-kit's own spread props always overrode)
- [x] `00-index.md` DB registry, status and changelog are updated

### Implementation Notes (Phase 1)
- **Two real bugs found while writing tests, both fixed:**
  - `TagPicker`-style lesson repeated: n/a here — instead, `nextPosition({ spaceId, taskId })` destructured the wrong keys (the caller passes `{ space_id, task_id }`); fixed to `{ space_id, task_id }`, which also fixed the scoped position query.
  - `AddTodoInput`'s default space was frozen in `useState(spaceId ?? …)` on first render, so it never picked up the real space if it wasn't ready yet on mount. Fixed by deriving it every render (`manualSpace ?? spaceId ?? activeSpaces[0]?.id`), only pinning a value once the user actually picks one in Global.
- **The header's "New todo" button and the checklist-visibility switch moved out of `usePageHeader`'s `actions`** and into the page's own header block (matching `TasksPage`'s own "New task" button). `usePageHeader`'s `actions` render inside `AppShell`'s breadcrumb bar, which a page-only test harness never mounts — same reasoning as why `TasksPage` never put its primary action there either.
- **`daysAgoISO` moved from `features/tasks/utils.js` to `lib/dates.js`**, now that a second feature (todos) needs it; `tasks/api.js` and `todos/api.js` both import it from there. Its test moved to `tests/lib/dates.test.js`.
- **`useDefaultSpaceId` moved from a private helper in `TaskDialog.jsx` to `src/hooks/useDefaultSpaceId.js`**, now that `TodoDialog` needs the identical logic.
- **`setTaskTags`-style lesson repeated:** `useUpdateTask`/`useDeleteTask`/`useRestoreTask` in `tasks/api.js` now invalidate `todoKeys` (imported from `todos/api.js`) after a space move, delete or restore, matching the doc's "Impact on Existing Features" table. This is a one-directional import (`tasks` → `todos`), the same shape as `tags` → `tasks` in Feature 04 Phase 3.
- **The strike-through on a completed todo is instant** (plain CSS `line-through`), not the sweeping `scaleX` animation design-system.md describes for task/todo completion. Building a true sweep-then-600ms-hold-then-collapse choreography was cut for scope; the checkbox's scale-and-fill animation plus the row's group-to-group glide (via `AnimatePresence`) already deliver the "satisfying micro-interaction" the goal asks for.
- **New shared pieces:** `useDefaultSpaceId` (`src/hooks/`), the `flashPulse` motion preset (`components/motion/presets.js`, logged in `design-system.md`).
- **`Todos.dc.html`** (an un-wired, pre-merge design file) was the visual source for the page; see the design fold above.

---

## Phase 2: Task Checklists ✅ Complete

### Goal
A task can carry a checklist of todos with add, toggle, reorder, delete and a live "3/5" progress count. The reusable `TodoChecklist` is mounted in `TaskDialog` (edit mode) now and on the task detail page in Feature 07. Task rows and board cards show a small progress badge when a task has checklist items.

### Before Starting: Confirm Phase 1 Is Approved
1. Phase 1 is `✅ Complete`.
2. Check whether PostgREST aggregates are enabled on the project (`select=task_id,count()`); they are off by default. The plan below does **not** need them: it reads `task_id, is_done` and counts on the client. Do not enable aggregates without asking.
3. `TaskList`, `TaskRow`, `TaskBoard` and `BoardCard` exist from Feature 04.

### 2.1 Database
No database changes in this phase.

### 2.2 API Layer
Additions to `src/features/todos/api.js`:

| Function / hook | Details |
|---|---|
| `fetchChecklistProgress({ spaceIds })` | `select('task_id, is_done').in('space_id', spaceIds).not('task_id', 'is', null).is('deleted_at', null)`, reduced to `Map<taskId, { done, total }>` (`toProgressMap` in `utils.js`, tested) |
| `useChecklistProgress({ spaceIds })` | `todoKeys.progress({ spaceIds })`; `enabled: spaceIds?.length > 0`; `select` returns the Map. Covered by every `todoKeys.all` invalidation |
| `useTodos({ taskId })` | already supported (Phase 1); checklists always include done items and order by `position` |

`useToggleTodo` also patches `todoKeys.progress` caches optimistically (adjust `done` for the item's task) so badges update instantly.

### 2.3 Components

```
src/features/todos/components/
├── TodoChecklist.jsx            # ({ taskId, spaceId, className })
├── ChecklistItem.jsx            # compact TodoItem variant: handle, checkbox, inline edit, delete (no chips)
├── ChecklistProgress.jsx        # ({ done, total }) "3/5" + thin bar (scaleX transform)
└── ChecklistProgressBadge.jsx   # ({ progress }) CheckSquare icon + "3/5"; muted, success tone when complete; renders nothing when total = 0
```

**`TodoChecklist`** `({ taskId, spaceId })`
- `useTodos({ taskId })`. Header: "Checklist" + `ChecklistProgress`.
- Items sortable (same sensors as Phase 1); toggle, inline edit and delete with Undo, reusing the Phase 1 hooks.
- An "Add item" input at the bottom: Enter adds `{ task_id: taskId, space_id: spaceId, title, position: positionAfterLast }` and keeps focus.
- States: 3-row skeleton; `ErrorState`; empty shows only the add input with the hint "Break this task into steps".
- Motion: `AnimatedList` items; the progress bar animates `scaleX`.

**Integration**
- `TaskDialog` (edit mode only) shows a collapsible "Checklist" section with `TodoChecklist taskId={task.id} spaceId={task.space_id}`. Checklist changes save immediately and do not depend on the form's submit; the section says so in its hint.
- `TaskList` and `TaskBoard` call `useChecklistProgress({ spaceIds: scopeSpaceIds })` once and pass `progress={map.get(task.id)}` to `TaskRow` and `BoardCard`, which render `ChecklistProgressBadge`.

### 2.4 Routes and Integration
None.

### 2.5 Impact on Existing Features
| Existing feature | Impact | Action |
|---|---|---|
| 04 `TaskRow`, `BoardCard` | New optional `progress` prop | Render `ChecklistProgressBadge` |
| 04 `TaskDialog` | Checklist section in edit mode | Mount `TodoChecklist` |
| 04 task delete, restore, space move | Progress counts change via triggers | Covered by the `todoKeys.all` invalidation added in Phase 1 |
| 07 task detail (future) | Mounts `TodoChecklist` in the main column | Import from `@/features/todos/components/TodoChecklist` |

### 2.6 Not in This Phase
- Converting a checklist item into a task, or a todo into a checklist item: backlog
- Checklist templates: backlog

### 2.7 Checklist: Before Marking Complete
- [x] `TodoChecklist` adds, toggles, edits, reorders and deletes items; progress updates live (tests). Reorder's position maths and its optimistic mutation are tested; a real drag can't run in jsdom.
- [x] Checklist items also appear on the Todos page with the "↳ task" chip (unless hidden) — unchanged from Phase 1, which already built this
- [x] Task rows, grid cards and board cards show "done/total" only for tasks with items, and update instantly on toggle (tests). The grid card also got the badge, matching G2's card spec, which the Phase 1 doc's component list didn't call out explicitly
- [x] Deleting a checklist item and pressing Undo restores it (test). A checklist *task's* delete/restore/space-move was already covered by Phase 1's `todoKeys` invalidation in `useDeleteTask`/`useRestoreTask`/`useUpdateTask`
- [x] `toProgressMap` has unit tests
- [x] `npm run lint`, `npm test` (212 tests) and `npm run build` pass
- [x] `axon-rules` audit is clean for the changed files
- [x] `00-index.md` status and changelog are updated — **Feature 05 is now complete**

### Implementation Notes (Phase 2)

**Two real bugs surfaced while writing tests, both fixed — one is a retroactive fix to Phase 1:**
- **Critical, affects Phase 1 too:** `AnimatedCheckbox`'s "pop" animation (`scale: [1, 1.08, 1]`) was paired with `springs.snappy`, a spring transition. Motion's spring/inertia transitions only support two keyframes, not three, and throw at runtime the moment you check a box — in the real browser, not just in tests. This has been true since Phase 1 built the component; nothing in Phase 1's own tests happened to surface it (see below). Fixed by giving the 3-keyframe pop its own tween transition (duration-based, not spring) while leaving everything else spring-driven. **Please re-verify checking a todo on the Todos page**, not just the new checklist, now that this is fixed.
- **Sonner toasts were unclickable while a modal Radix Dialog was open.** Radix's `DismissableLayer` sets `document.body.style.pointerEvents = 'none'` while a modal layer (like `TaskDialog`) is open, and only restores it for nodes it recognises as part of that same layer tree. Sonner's toaster is a separate, sibling portal, so it inherited `none` and its buttons (including Undo) stopped responding — only surfaced now because deleting a checklist item is the first Undo-toast action that happens *while a dialog stays open*. Fixed with the standard workaround: an inline `pointerEvents: 'auto'` on the Toaster's root in `src/components/ui/sonner.jsx` (it always wins over an inherited value). This fixes Undo everywhere a toast can appear over an open dialog, not just here.
- **Why Phase 1 didn't catch the checkbox bug:** its own tests only ever *unchecked* an item or checked one without a following assertion that waited past the animation's microtask queue before the test ended; the throw became an unhandled rejection that vitest didn't attach to a specific assertion. Building Phase 2's tests, which check an item and then immediately assert on the live progress count, forced the animation to run to completion inside the test's own `waitFor`, which is what surfaced it.
- **`SortableTodoList` was generalised** to take `renderItem(todo, dragHandleProps)` instead of being hardcoded to `TodoItem`, so `TodoChecklist` could reuse the exact same dnd-kit wiring (sensors, modifiers, drag-end position math) for `ChecklistItem` rows instead of duplicating it.
- **`AnimatedCheckbox` gained a `size` prop** (`default` 17px/rounded-md for the Todos page, `sm` 15px/rounded-sm for the compact checklist row), matching the two sizes the design actually uses (`Todos.dc.html` vs `Task Detail.dc.html`).
- **The checklist's progress cache stores raw `{ id, task_id, is_done }` rows, not the reduced map,** so `useToggleTodo` can patch one row and let `toProgressMap` (applied via React Query's `select`) recompute the counts on read, instead of hand-rolling map arithmetic in the optimistic update.
- **`ChecklistProgressBadge` uses `list-checks`** (the icon the source design actually shows in the card footer), not `CheckSquare` as this doc's plan said before the design was checked.
- **The "Checklist" section in `TaskDialog`** is a small collapsible (`ChecklistSection`, in `features/todos/components/` since it's todos-owned chrome around `TodoChecklist`), open by default, with a hint that it saves immediately and doesn't depend on the dialog's own submit.

**Feature 05 (Todos) is now complete.**

---

## Data Model Summary (after all phases)

```
spaces 1 ── n todos (standalone: task_id NULL)
tasks  1 ── n todos (checklist: task_id set; space_id follows the task by trigger)
tasks soft delete / restore / space move ──► todos (tasks_cascade_to_todos)
```

### `todos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK; `unique(id, user_id)` |
| `space_id` | uuid | composite FK to spaces; overwritten from the task for checklist items |
| `task_id` | uuid | composite FK to tasks, cascade; NULL = standalone |
| `title` | text | 1–500 |
| `is_done` / `done_at` | boolean / timestamptz | `done_at` trigger-maintained |
| `due_date` | date | drives the Todos page groups |
| `position` | double | fractional ordering |
| `deleted_at` | timestamptz | soft delete; cascaded from the task with the same value |

## Out of Scope (All Phases)
- Natural-language dates in the add input: backlog
- Recurring todos and reminders: Feature 16
- Inbox triage into todos: Feature 13
- Todos on the dashboard: Feature 10
