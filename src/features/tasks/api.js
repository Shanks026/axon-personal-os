import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { positionAfterLast } from '@/lib/position'
import { DONE_WINDOW_DAYS } from '@/features/tasks/constants'
import { daysAgoISO } from '@/features/tasks/utils'

export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (params) => [...taskKeys.lists(), params], // { spaceIds, priority, due, q, today, weekEnd, allClosed }
  details: () => [...taskKeys.all, 'detail'],
  detail: (id) => [...taskKeys.details(), id],
}

const LIST_COLUMNS =
  'id, space_id, title, description_text, status, priority, start_date, due_date, completed_at, external_url, position, pinned_at, created_at, updated_at'

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Scoped task list. Tab and status filtering happen on the client (so tab counts stay live);
 * priority, due window and search run here. Closed tasks older than DONE_WINDOW_DAYS are left
 * out unless `allClosed` (Completed tab or an explicit status filter).
 */
export async function fetchTasks({ spaceIds, priority = [], due, q, today, weekEnd, allClosed }) {
  let query = supabase
    .from('tasks')
    .select(LIST_COLUMNS)
    .in('space_id', spaceIds)
    .is('deleted_at', null)
    .order('position', { ascending: true })

  if (priority.length) query = query.in('priority', priority)
  if (due === 'overdue') query = query.lt('due_date', today).not('status', 'in', '(done,cancelled)')
  if (due === 'today') query = query.eq('due_date', today)
  if (due === 'week') query = query.gte('due_date', today).lte('due_date', weekEnd)
  if (due === 'none') query = query.is('due_date', null)
  if (q?.trim()) query = query.ilike('title', `%${escapeLike(q.trim())}%`)
  if (!allClosed && today) {
    query = query.or(
      `status.not.in.(done,cancelled),updated_at.gte.${daysAgoISO(today, DONE_WINDOW_DAYS)}`,
    )
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

async function nextPosition(spaceId) {
  const { data, error } = await supabase
    .from('tasks')
    .select('position')
    .eq('space_id', spaceId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return positionAfterLast(data ? [data.position] : [])
}

export async function createTask(values) {
  const position = values.position ?? (await nextPosition(values.space_id))
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...values, position })
    .select(LIST_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id, patch) {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select(LIST_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export const softDeleteTask = (id) => updateTask(id, { deleted_at: new Date().toISOString() })
export const restoreTask = (id) => updateTask(id, { deleted_at: null })

export function useTasks(params) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    enabled: params.spaceIds?.length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
    onError: (err) => toast.error(err.message ?? 'Could not create task'),
  })
}

/** Full edits from the dialog. */
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateTask(id, patch),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.setQueryData(taskKeys.detail(row.id), row)
    },
    onError: (err) => toast.error(err.message ?? 'Could not save task'),
  })
}

/** Renumber a column to (i + 1) * 1000 when fractional positions can no longer be split. */
export function rebalanceTasks(orderedIds) {
  return Promise.all(orderedIds.map((id, i) => updateTask(id, { position: (i + 1) * 1000 })))
}

/** Patch every cached list optimistically; roll back with a toast on error. */
function useOptimisticPatch(mutationFn, errorMessage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: taskKeys.lists() })
      const snapshots = qc.getQueriesData({ queryKey: taskKeys.lists() })
      qc.setQueriesData({ queryKey: taskKeys.lists() }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
      return { snapshots }
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? errorMessage)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.lists() }),
  })
}

/** Optimistic one-field changes from cards and rows: status, priority, due date. */
export function useQuickUpdateTask() {
  return useOptimisticPatch(({ id, patch }) => updateTask(id, patch), 'Could not update task')
}

/**
 * Board drop: `patch` is { status, position }. `rebalanceIds` (the column in its new order) is
 * renumbered after the move when the neighbours were too close to split.
 */
export function useMoveTask() {
  return useOptimisticPatch(async ({ id, patch, rebalanceIds }) => {
    const row = await updateTask(id, patch)
    if (rebalanceIds?.length) await rebalanceTasks(rebalanceIds)
    return row
  }, 'Could not move task')
}

function useRemoveFromLists() {
  const qc = useQueryClient()
  return async (id) => {
    await qc.cancelQueries({ queryKey: taskKeys.lists() })
    const snapshots = qc.getQueriesData({ queryKey: taskKeys.lists() })
    qc.setQueriesData({ queryKey: taskKeys.lists() }, (old) => old?.filter((t) => t.id !== id))
    return { snapshots }
  }
}

/** Soft delete (to Trash), optimistic. */
export function useDeleteTask() {
  const qc = useQueryClient()
  const removeFromLists = useRemoveFromLists()
  return useMutation({
    mutationFn: softDeleteTask,
    onMutate: removeFromLists,
    onError: (err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not delete task')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  })
}

export function useRestoreTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreTask,
    onSettled: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not restore task'),
  })
}
