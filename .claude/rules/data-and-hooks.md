---
paths:
  - "src/features/**/api.js"
  - "src/features/**/hooks/**"
  - "src/hooks/**"
  - "src/context/**"
  - "src/lib/**"
---

# Data Layer and Hooks

## `features/<f>/api.js`: the only place that touches Supabase

Each `api.js` exports three kinds of thing, in this order.

### 1. A query key factory

```js
export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (params) => [...taskKeys.lists(), params],   // params = { spaceIds, status, ... }
  details: () => [...taskKeys.all, 'detail'],
  detail: (id) => [...taskKeys.details(), id],
}
```

- Every key begins with the feature's root (`['tasks']`), so `invalidateQueries({ queryKey: taskKeys.all })` clears the whole feature.
- The params object always includes `spaceIds` for space-scoped data.

### 2. Plain async functions, one per operation

```js
export async function fetchTasks({ spaceIds, status, search }) { ... }
export async function createTask(values) { ... }            // returns the created row
export async function updateTask(id, patch) { ... }
export async function softDeleteTask(id) { ... }            // sets deleted_at
export async function restoreTask(id) { ... }
```

- Each function unwraps the result: `const { data, error } = await ...; if (error) throw error; return data`. Never swallow errors or return `null` to hide one.
- Always `.select()` after insert or update, and return the row.
- Scoped reads filter with `.in('space_id', spaceIds)` and `.is('deleted_at', null)`.
- `user_id` is **not** sent from the client. The column defaults to `auth.uid()`.
- Keep select strings explicit (`'id, title, status, space_id, ...'`) for list views. Use `*` only on detail reads.

### 3. React hooks

```js
export function useTasks(params) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    enabled: params.spaceIds?.length > 0,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not create task'),
  })
}
```

- Name read hooks `useXxx` for lists and `useXxx(id)` for single records, e.g. `useTasks`, `useTask(id)`.
- Name mutation hooks `useCreateXxx`, `useUpdateXxx`, `useDeleteXxx` and so on. **Invalidation lives in the hook**, not in components.
- Guard every dependent query with `enabled` (`!!id`, `spaceIds?.length > 0`).
- Use optimistic updates (`onMutate` with snapshot and rollback) only where latency is felt: status changes, kanban moves, todo toggles and reordering.
- When a mutation affects another feature's data, invalidate that feature's root key too. For example, deleting a task invalidates `todoKeys.all` and `linkKeys.all`.
- Global defaults are in `lib/queryClient.js`: `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: false`.

## Custom hooks

- One hook per file. The file name equals the hook name. It lives in `hooks/` (shared) or `features/<f>/hooks/` (one feature).
- Return an object, not a tuple, unless the hook mirrors `useState` (e.g. `useLocalStorage`).
- Keep URL-driven state in the URL:
  - Filters, search, active view and selected date go in `useSearchParams`, wrapped in a feature hook such as `useTaskFilters()` that parses and serialises the params.
  - Per-viewer preferences (collapsed sidebar, last view mode) go in `useLocalStorage`, and every read and write is wrapped in try/catch.
- Never put server data in React state or context. Context holds only session and space identity.
- Don't call hooks inside the plain async `api.js` functions. Pass what they need as arguments.

## Contexts

Only two contexts exist. Add a new one only with the user's approval.

- **`AuthContext`:** `{ session, user, loading, signOut }`. It subscribes to `onAuthStateChange` once. While `loading`, the app renders a neutral splash, never a redirect. The profile is server state, so read it through `useMyProfile()` or `usePreferences()`, not context.
- **`SpaceContext`:** `{ spaceSlug, space, isGlobal, spaces, activeSpaces, scopeSpaceIds }`.
  - It is resolved from the `:spaceSlug` route param and the `useSpaces()` query.
  - `space` is `null` in Global.
  - Consume it through `useSpace()`, which throws outside the provider.

## Hook usage rules (React)

- Hooks go at the top level only, never inside conditions or loops. Use `enabled` to skip a query instead.
- Memoise callbacks passed to memoised children or used in effect dependencies. Don't sprinkle `useCallback` or `useMemo` anywhere else.
- Every effect needs a cleanup when it subscribes, sets a timer or adds a listener.
- Debounce editor autosave (800ms default) with `useDebouncedCallback`. Flush on unmount and on `beforeunload`.
