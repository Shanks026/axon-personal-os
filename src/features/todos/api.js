import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { daysAgoISO, toISODate } from '@/lib/dates'
import { positionAfterLast } from '@/lib/position'
import { DONE_WINDOW_DAYS } from '@/features/todos/constants'
import { toProgressMap } from '@/features/todos/utils'

export const todoKeys = {
  all: ['todos'],
  lists: () => [...todoKeys.all, 'list'],
  list: (params) => [...todoKeys.lists(), params], // { spaceIds, taskId, includeDone, doneSince, checklist, dueFrom, dueTo }
  progress: (params) => [...todoKeys.all, 'progress', params], // Phase 2
}

const COLUMNS =
  'id, space_id, task_id, title, is_done, done_at, due_date, position, created_at, task:tasks(id, title, status)'

/**
 * A task's checklist (`taskId`) ignores space scope and the done window: it always reads every
 * item for that task, in position order. Otherwise this is the space-scoped Todos page: open
 * todos plus done ones from the last `DONE_WINDOW_DAYS`, optionally hiding checklist items.
 * A due-date window (`dueFrom` / `dueTo`, inclusive: the calendar) replaces the done window, so
 * done todos stay on the day they were due.
 */
export async function fetchTodos({
  spaceIds,
  taskId,
  includeDone,
  doneSince,
  checklist,
  dueFrom,
  dueTo,
}) {
  let query = supabase.from('todos').select(COLUMNS).is('deleted_at', null).order('position')

  if (taskId) {
    query = query.eq('task_id', taskId)
  } else if (dueFrom || dueTo) {
    query = query.in('space_id', spaceIds)
    if (dueFrom) query = query.gte('due_date', dueFrom)
    if (dueTo) query = query.lte('due_date', dueTo)
  } else {
    query = query.in('space_id', spaceIds)
    query = includeDone
      ? query.or(`is_done.eq.false,done_at.gte.${doneSince}`)
      : query.eq('is_done', false)
    if (checklist === 'hide') query = query.is('task_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export function useTodos(
  { spaceIds, taskId, includeDone = true, checklist, dueFrom, dueTo } = {},
  { enabled = true } = {},
) {
  const doneSince = daysAgoISO(toISODate(new Date()), DONE_WINDOW_DAYS)
  const params = { spaceIds, taskId, includeDone, doneSince, checklist, dueFrom, dueTo }
  return useQuery({
    queryKey: todoKeys.list(params),
    queryFn: () => fetchTodos(params),
    enabled: enabled && (!!taskId || spaceIds?.length > 0),
  })
}

/**
 * Every checklist todo's done state, scoped to `spaceIds`. Reduced to `Map<taskId, { done, total }>`
 * on read (`select`); the cache itself keeps the raw rows, so `useToggleTodo` can patch a single
 * row optimistically without recomputing the whole map by hand.
 */
export async function fetchChecklistProgress({ spaceIds }) {
  const { data, error } = await supabase
    .from('todos')
    .select('id, task_id, is_done')
    .in('space_id', spaceIds)
    .not('task_id', 'is', null)
    .is('deleted_at', null)
  if (error) throw error
  return data
}

export function useChecklistProgress({ spaceIds } = {}) {
  return useQuery({
    queryKey: todoKeys.progress({ spaceIds }),
    queryFn: () => fetchChecklistProgress({ spaceIds }),
    select: toProgressMap,
    enabled: spaceIds?.length > 0,
  })
}

async function nextPosition({ space_id, task_id }) {
  let query = supabase.from('todos').select('position').order('position', { ascending: false })
  query = task_id
    ? query.eq('task_id', task_id)
    : query.eq('space_id', space_id).is('task_id', null)
  const { data, error } = await query.limit(1).maybeSingle()
  if (error) throw error
  return positionAfterLast(data ? [data.position] : [])
}

export async function createTodo(values) {
  const position = values.position ?? (await nextPosition(values))
  const { data, error } = await supabase
    .from('todos')
    .insert({ ...values, position })
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateTodo(id, patch) {
  const { data, error } = await supabase
    .from('todos')
    .update(patch)
    .eq('id', id)
    .select(COLUMNS)
    .single()
  if (error) throw error
  return data
}

export const softDeleteTodo = (id) => updateTodo(id, { deleted_at: new Date().toISOString() })
export const restoreTodo = (id) => updateTodo(id, { deleted_at: null })

export function useCreateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTodo,
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.lists() }),
    onError: (err) => toast.error(err.message ?? 'Could not create todo'),
  })
}

/** A just-created task's staged checklist (TaskDialog create mode), in order. */
export async function createChecklistItems(taskId, spaceId, titles) {
  const { error } = await supabase.from('todos').insert(
    titles.map((title, i) => ({
      task_id: taskId,
      space_id: spaceId,
      title,
      position: (i + 1) * 1000,
    })),
  )
  if (error) throw error
}

export function useCreateChecklistItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, spaceId, titles }) => createChecklistItems(taskId, spaceId, titles),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not save the checklist'),
  })
}

export function useUpdateTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateTodo(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: todoKeys.lists() }),
    onError: (err) => toast.error(err.message ?? 'Could not save todo'),
  })
}

/** Patch every cached list optimistically; roll back with a toast on error. */
function useOptimisticPatch(patchLocal, mutationFn, errorMessage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: todoKeys.lists() })
      const snapshots = qc.getQueriesData({ queryKey: todoKeys.lists() })
      qc.setQueriesData({ queryKey: todoKeys.lists() }, (old) =>
        old?.map((t) => (t.id === vars.id ? patchLocal(t, vars) : t)),
      )
      return { snapshots }
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? errorMessage)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: todoKeys.lists() }),
  })
}

const isProgressQuery = (query) => query.queryKey[1] === 'progress'

/**
 * Check / uncheck, optimistic: `done_at` moves locally so the group re-sorts instantly, and a
 * checklist item's row in every cached `todoKeys.progress` query updates too, so its task's
 * badge changes without waiting for a refetch. Both cache families roll back together on error.
 */
export function useToggleTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, is_done }) => updateTodo(id, { is_done }),
    onMutate: async ({ id, is_done }) => {
      await qc.cancelQueries({ queryKey: todoKeys.all })
      const snapshots = qc.getQueriesData({ queryKey: todoKeys.all })
      qc.setQueriesData({ queryKey: todoKeys.lists() }, (old) =>
        old?.map((t) =>
          t.id === id ? { ...t, is_done, done_at: is_done ? new Date().toISOString() : null } : t,
        ),
      )
      qc.setQueriesData({ queryKey: todoKeys.all, predicate: isProgressQuery }, (old) =>
        old?.map((r) => (r.id === id ? { ...r, is_done } : r)),
      )
      return { snapshots }
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not update todo')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

/** Drag reorder within a group, optimistic. */
export function useReorderTodo() {
  return useOptimisticPatch(
    (t, { position }) => ({ ...t, position }),
    ({ id, position }) => updateTodo(id, { position }),
    'Could not reorder todo',
  )
}

function useRemoveFromLists() {
  const qc = useQueryClient()
  return async (id) => {
    await qc.cancelQueries({ queryKey: todoKeys.lists() })
    const snapshots = qc.getQueriesData({ queryKey: todoKeys.lists() })
    qc.setQueriesData({ queryKey: todoKeys.lists() }, (old) => old?.filter((t) => t.id !== id))
    return { snapshots }
  }
}

/** Soft delete (to Trash), optimistic. */
export function useDeleteTodo() {
  const qc = useQueryClient()
  const removeFromLists = useRemoveFromLists()
  return useMutation({
    mutationFn: softDeleteTodo,
    onMutate: removeFromLists,
    onError: (err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not delete todo')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
  })
}

export function useRestoreTodo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreTodo,
    onSettled: () => qc.invalidateQueries({ queryKey: todoKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not restore todo'),
  })
}
