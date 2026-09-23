# Axon: Code Patterns

These are the established patterns. Follow them exactly, and update this file when a pattern deliberately changes.

---

## 1. Space scope (how Global works)

```jsx
// src/context/SpaceContext.jsx (shape)
const value = {
  spaceSlug,                 // 'thmp' | 'global'
  isGlobal,                  // spaceSlug === 'global'
  space,                     // row | null in Global
  spaces,                    // all rows (incl. archived), ordered by position
  activeSpaces,              // archived_at is null
  scopeSpaceIds,             // isGlobal ? activeSpaces.map(s => s.id) : [space.id]
  spaceById,                 // Map<id, space>, used for SpaceBadge in Global lists
}
```

```jsx
// Any scoped page/component
const { scopeSpaceIds, isGlobal } = useSpace()
const { data: tasks } = useTasks({ spaceIds: scopeSpaceIds, status })
// in Global, rows render <SpaceBadge spaceId={task.space_id} />
```

Create dialogs:

```jsx
const { space, isGlobal } = useSpace()
defaultValues: { space_id: space?.id ?? lastUsedSpaceId ?? activeSpaces[0]?.id, ... }
{isGlobal && <SpacePickerField control={form.control} name="space_id" />}
```

## 2. `api.js` skeleton

```js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (params) => [...taskKeys.lists(), params],
  detail: (id) => [...taskKeys.all, 'detail', id],
}

const LIST_COLUMNS = 'id, space_id, title, status, priority, start_date, due_date, completed_at, position, pinned_at, updated_at'

export async function fetchTasks({ spaceIds, status, priority, search }) {
  let q = supabase.from('tasks').select(LIST_COLUMNS)
    .in('space_id', spaceIds).is('deleted_at', null)
    .order('position', { ascending: true })
  if (status?.length) q = q.in('status', status)
  if (priority?.length) q = q.in('priority', priority)
  if (search) q = q.ilike('title', `%${search}%`)
  const { data, error } = await q
  if (error) throw error
  return data
}

export async function updateTask(id, patch) {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export function useTasks(params) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    enabled: params.spaceIds?.length > 0,
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateTask(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.setQueryData(taskKeys.detail(row.id), row)
    },
    onError: (err) => toast.error(err.message ?? 'Could not update task'),
  })
}
```

## 3. Optimistic update (status, kanban move, todo toggle)

```js
onMutate: async ({ id, patch }) => {
  await qc.cancelQueries({ queryKey: taskKeys.lists() })
  const snapshots = qc.getQueriesData({ queryKey: taskKeys.lists() })
  qc.setQueriesData({ queryKey: taskKeys.lists() }, (old) =>
    old?.map((t) => (t.id === id ? { ...t, ...patch } : t)))
  return { snapshots }
},
onError: (err, _vars, ctx) => {
  ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
  toast.error(err.message ?? 'Could not update')
},
onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
```

## 4. Soft delete with Undo

```js
// api.js
export const softDeleteTask = (id) => updateTask(id, { deleted_at: new Date().toISOString() })
export const restoreTask    = (id) => updateTask(id, { deleted_at: null })

// component
const del = useDeleteTask(); const restore = useRestoreTask()
del.mutate(task.id, {
  onSuccess: () => toast('Task moved to Trash', { action: { label: 'Undo', onClick: () => restore.mutate(task.id) } }),
})
```

Cascades (for example checklist todos) happen in DB triggers that stamp the same `deleted_at` value. See `tasks_cascade_to_todos` in `data-model.md`.

## 5. Fractional ordering (`lib/position.js`)

```js
export function positionBetween(before, after) {
  if (before == null && after == null) return 1000
  if (before == null) return after - 1000
  if (after == null) return before + 1000
  return (before + after) / 2
}
export const needsRebalance = (a, b) => Math.abs(a - b) < 1e-9
```

- New items at the bottom get `max(position) + 1000`.
- A drag-and-drop move updates only the moved row's `position` (and `status` for a kanban column change).

## 6. Rich text (Tiptap) storage and autosave

```js
// save payload
{ content: editor.getJSON(), content_text: editor.getText({ blockSeparator: '\n' }).slice(0, 100_000) }
```

- `components/editor/RichTextEditor.jsx` props: `value` (JSON), `onChange(json, text)`, `placeholder`, `editable`, `features` (for example `{ slash: true, taskMentions: true }`).
- Pages debounce saves at 800ms with `useDebouncedCallback`, flush on unmount, and show a "Saving… / Saved" indicator.
- Task mentions are inline nodes `{ type: 'taskMention', attrs: { id, label } }`. On save, collect the ids and call `sync_note_mentions`.

## 7. Fiscal maths (`lib/fiscal.js`)

```js
// fyStartMonth: 1–12 (profile.fy_start_month; default 4 = April)
getFiscalYear(date, fyStartMonth)          // → 2026 for 2026-09-23 with April start
getFiscalQuarter(date, fyStartMonth)       // → { fiscalYear: 2026, quarter: 2, start: Date(2026-07-01), end: Date(2026-09-30) }
getQuarterRange(fiscalYear, quarter, fyStartMonth) // → { start, end }
formatFiscalYear(fiscalYear, fyStartMonth) // → 'FY 2026–27' ; when fyStartMonth === 1 → 'FY 2026'
formatQuarter({ fiscalYear, quarter }, fyStartMonth) // → 'Q2 FY 2026–27'
listQuarters(fromDate, toDate, fyStartMonth)
```

These functions have required Vitest coverage, including year-boundary cases (March 31 → April 1, Dec 31 → Jan 1 when the start month is 1).

## 8. RLS and table SQL

Use the table template in `.claude/rules/supabase.md`. Every FK to a user-owned row is composite `(x_id, user_id)`.

## 9. Search params state

```js
// features/tasks/hooks/useTaskFilters.js
export function useTaskFilters() {
  const [params, setParams] = useSearchParams()
  const filters = {
    view: params.get('view') ?? 'list',          // list | board
    status: params.getAll('status'),
    priority: params.getAll('priority'),
    tag: params.getAll('tag'),
    q: params.get('q') ?? '',
  }
  const setFilter = (key, value) => setParams((p) => { /* set/delete */ return p }, { replace: true })
  return { filters, setFilter, clear: () => setParams({}, { replace: true }) }
}
```

## 10. Shared components catalogue (grows as built)

| Component | Path | Feature |
|---|---|---|
| `EmptyState` | `components/shared/EmptyState.jsx` | 01 |
| `ConfirmDialog` | `components/shared/ConfirmDialog.jsx` | 01 |
| `PageTransition`, `presets` | `components/motion/` | 01 |
| `PageHeader` + `usePageHeader` | `components/layout/` | 03 |
| `SpaceBadge`, `SpaceIcon`, `spaceIconMap` | `components/shared/` | 03 |
| `UserMenu` | `components/layout/` | 03 (gallery header; sidebar in Phase 2) |
| `SpacePickerField` | `components/shared/` | 04 (first Global create dialog) |
| `SegmentedControl` | `components/shared/` | 02 (week start; later view toggles) |
| `SaveIndicator` | `components/shared/` | 02 (settings; later the editors) |
| `TagPicker`, `TagPill`, `ManageTagsDialog` | `components/shared/` | 04 |
| `DatePicker`, `DatePickerField` | `components/shared/` | 04 |
| `RichTextEditor` | `components/editor/` | 06 |
| `EntityLink` (task/note chip with hover preview) | `components/shared/` | 07 |

| Mention-id collector (`collectTaskMentionIds`) | `components/editor/` | 07/09 |
| `useNow` | `hooks/` | 08 |
| `StatTile` | `components/shared/` | 11 (moved from dashboard) |
| `GlobalDialogs` (`?new=task\|todo\|note\|event\|capture`) + `useGlobalDialog` | `components/layout/` | 12 |
| `ShortcutKeys` (kbd) + `lib/shortcuts.js` registry + `useShortcut` | `components/shared/`, `lib/`, `hooks/` | 12 |
| `useListNavigation` | `hooks/` | 12 |
| `PinToggle` | `components/shared/` | 14 |

Every create dialog (`TaskDialog`, `TodoDialog`, `EventDialog`) takes `({ open, onOpenChange, <entity>, initialValues, onSuccess })` and must be mountable on its own, because `GlobalDialogs` opens it from anywhere. Every soft-deletable feature exports `restoreX` / `useRestoreX`, which the Undo toast and Trash (14) use.
