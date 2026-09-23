# Feature 05: Todos (Quick Checklist)

**Product**: Axon, a personal second-brain OS
**File**: `.claude/features/05-todos.md`
**Status**: 🔵 Planned
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

### Before Starting: Confirm With Codebase
1. Feature 04 Phase 3 is complete: `tasks` exists; `taskKeys`, `useDeleteTask`, `useRestoreTask`, `useUpdateTask` exist; `DatePicker`, `SpaceBadge`, `AnimatedList` and `lib/position.js` exist.
2. Check the current shadcn `checkbox` API (Radix `onCheckedChange`) and that motion can wrap its indicator; otherwise build `AnimatedCheckbox` from a `<button role="checkbox" aria-checked>` with a motion SVG path.
3. Check dnd-kit `restrictToVerticalAxis` / `restrictToParentElement` modifiers (`@dnd-kit/modifiers`); install it if it is missing.
4. Confirm PostgREST embeds `task:tasks(id, title, status)` through the composite `(task_id, user_id)` FK.
5. Use the Supabase MCP to confirm `public.todos` does not exist.

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
- [ ] `create_todos` is applied and mirrored; the four trigger checks above pass; advisors are clean
- [ ] Enter adds a todo with and without a due date, in a space and in Global (space required)
- [ ] Grouping is correct around midnight boundaries (unit tests for `groupTodos`)
- [ ] Toggling is instant, animates, and rolls back on failure; Done shows the last 7 days only
- [ ] Inline edit saves on Enter or blur and cancels on Esc
- [ ] Drag reorder within a group persists after reload, by pointer and by keyboard
- [ ] Delete shows Undo, and Undo restores the todo; `restoreTodo` / `useRestoreTodo` are exported
- [ ] `TodoDialog` creates and edits (space required in Global), accepts `initialValues` and `onSuccess(row)`, and works mounted outside `TodosPage`
- [ ] `?highlight=<id>` scrolls to and flashes the todo (including one in the collapsed Done group), then clears the param
- [ ] Checklist todos show the "↳ task" chip; the switch hides them
- [ ] Deleting a task in Feature 04 removes its checklist todos from this page without a reload, and Undo brings them back
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` DB registry, status and changelog are updated

**Stop here. Show the result and wait for approval.**

---

## Phase 2: Task Checklists

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
- [ ] `TodoChecklist` adds, toggles, edits, reorders and deletes items; progress updates live
- [ ] Checklist items also appear on the Todos page with the "↳ task" chip (unless hidden)
- [ ] Task rows and board cards show "done/total" only for tasks with items, and update instantly on toggle
- [ ] Deleting a checklist task and pressing Undo restores its items and the badge
- [ ] `toProgressMap` has unit tests
- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `axon-rules` audit is clean for the changed files
- [ ] `00-index.md` status and changelog are updated

**Stop here. Show the result and wait for approval.**

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
