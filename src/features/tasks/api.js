import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { daysAgoISO } from '@/lib/dates'
import { positionAfterLast } from '@/lib/position'
import { mergeVersions } from '@/lib/versions'
import { DONE_WINDOW_DAYS } from '@/features/tasks/constants'
import { todoKeys } from '@/features/todos/api'

export const taskKeys = {
  all: ['tasks'],
  lists: () => [...taskKeys.all, 'list'],
  list: (params) => [...taskKeys.lists(), params], // { spaceIds, priority, due, q, tag, version, today, weekEnd, allClosed }
  details: () => [...taskKeys.all, 'detail'],
  detail: (id) => [...taskKeys.details(), id],
  versions: (spaceIds) => [...taskKeys.all, 'versions', spaceIds], // version suggestions
  activities: () => [...taskKeys.all, 'activity'],
  activity: (taskId) => [...taskKeys.activities(), taskId],
}

const LIST_COLUMNS =
  'id, space_id, title, description_text, status, priority, start_date, due_date, completed_at, versions, position, pinned_at, created_at, updated_at, tag_ids:task_tags(tag_id), links:task_links(id, url, label, position)'

const escapeLike = (s) => s.replace(/[\\%_]/g, (c) => `\\${c}`)

/**
 * Flattens the embedded `task_tags(tag_id)` rows into a plain `tag_ids: string[]`, and orders
 * `links` by position (PostgREST doesn't order a nested embed for us).
 */
function mapRow(row) {
  return {
    ...row,
    tag_ids: row.tag_ids?.map((t) => t.tag_id) ?? [],
    links: [...(row.links ?? [])].sort((a, b) => a.position - b.position),
  }
}

/**
 * Scoped task list. Tab and status filtering happen on the client (so tab counts stay live);
 * priority, due window, tag, version and search run here. Closed tasks older than DONE_WINDOW_DAYS are
 * left out unless `allClosed` (Completed tab or an explicit status filter).
 *
 * `tag` (any-of) joins `task_tags` a second time under its own alias, so the filter doesn't trim
 * the `tag_ids` a task actually has (an inner-joined single alias would).
 */
export async function fetchTasks({
  spaceIds,
  priority = [],
  due,
  q,
  tag = [],
  version = [],
  today,
  weekEnd,
  allClosed,
}) {
  let query = supabase
    .from('tasks')
    .select(tag.length ? `${LIST_COLUMNS}, tag_match:task_tags!inner(tag_id)` : LIST_COLUMNS)
    .in('space_id', spaceIds)
    .is('deleted_at', null)
    .order('position', { ascending: true })

  if (priority.length) query = query.in('priority', priority)
  if (tag.length) query = query.in('tag_match.tag_id', tag)
  if (version.length) query = query.overlaps('versions', version) // any of
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
  return data.map(mapRow)
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
  return mapRow(data)
}

export async function updateTask(id, patch) {
  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', id)
    .select(LIST_COLUMNS)
    .single()
  if (error) throw error
  return mapRow(data)
}

/**
 * One task with everything: the list columns plus the rich `description` (which lists leave
 * out; it's heavy). The detail page and the edit dialog read it. Not scope-filtered: entity routes
 * work in any scope. Cached under `detail(id)`.
 */
export async function fetchTask(id) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*, tag_ids:task_tags(tag_id), links:task_links(id, url, label, position)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export const softDeleteTask = (id) => updateTask(id, { deleted_at: new Date().toISOString() })
export const restoreTask = (id) => updateTask(id, { deleted_at: null })

export function useTask(id) {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: () => fetchTask(id),
    enabled: !!id,
  })
}

export function useTasks(params) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => fetchTasks(params),
    enabled: params.spaceIds?.length > 0,
    placeholderData: keepPreviousData,
  })
}

/**
 * Every version already used on a live task in these spaces, newest-looking first ("v3.10.0"
 * before "v3.9.0"): the suggestions in the dialog's version picker. Versions are free text, so
 * this is the only "list" of them.
 */
export async function fetchTaskVersions({ spaceIds }) {
  const { data, error } = await supabase
    .from('tasks')
    .select('versions')
    .in('space_id', spaceIds)
    .is('deleted_at', null)
    .not('versions', 'eq', '{}')
  if (error) throw error
  return mergeVersions(data.flatMap((r) => r.versions ?? []))
}

export function useTaskVersions({ spaceIds }) {
  return useQuery({
    queryKey: taskKeys.versions(spaceIds),
    queryFn: () => fetchTaskVersions({ spaceIds }),
    enabled: spaceIds?.length > 0,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTask,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: [...taskKeys.all, 'versions'] })
    },
    onError: (err) => toast.error(err.message ?? 'Could not create task'),
  })
}

/** Full edits from the dialog. */
export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateTask(id, patch),
    onSuccess: (row, { patch }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      // Merge: `row` has the list columns only, so keep the cached description (or the new one).
      qc.setQueryData(taskKeys.detail(row.id), (old) => ({
        ...old,
        ...row,
        ...('description' in patch && { description: patch.description }),
      }))
      if ('versions' in patch) qc.invalidateQueries({ queryKey: [...taskKeys.all, 'versions'] })
      qc.invalidateQueries({ queryKey: taskKeys.activity(row.id) })
      // A space move cascades to checklist todos (tasks_cascade_to_todos).
      if ('space_id' in patch) qc.invalidateQueries({ queryKey: todoKeys.all })
    },
    onError: (err) => toast.error(err.message ?? 'Could not save task'),
  })
}

/** Renumber a column to (i + 1) * 1000 when fractional positions can no longer be split. */
export function rebalanceTasks(orderedIds) {
  return Promise.all(orderedIds.map((id, i) => updateTask(id, { position: (i + 1) * 1000 })))
}

/**
 * Patch every cached list and the task's detail optimistically; roll back with a toast on
 * error. Settling refreshes the lists, the detail and the task's activity (the log trigger may
 * have added a row).
 */
function useOptimisticPatch(mutationFn, errorMessage) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: taskKeys.lists() })
      await qc.cancelQueries({ queryKey: taskKeys.detail(id) })
      const snapshots = qc.getQueriesData({ queryKey: taskKeys.lists() })
      const detail = qc.getQueryData(taskKeys.detail(id))
      qc.setQueriesData({ queryKey: taskKeys.lists() }, (old) =>
        old?.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
      if (detail) qc.setQueryData(taskKeys.detail(id), { ...detail, ...patch })
      return { snapshots, detail }
    },
    onError: (err, { id }, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      if (ctx?.detail) qc.setQueryData(taskKeys.detail(id), ctx.detail)
      toast.error(err.message ?? errorMessage)
    },
    onSettled: (_row, _err, { id }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: taskKeys.detail(id) })
      qc.invalidateQueries({ queryKey: taskKeys.activity(id) })
    },
  })
}

/** Optimistic one-field changes from cards, rows and the detail rail (status, priority, dates, versions, pin). */
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
    // The trigger soft-deletes checklist todos along with the task.
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: todoKeys.all })
    },
  })
}

export function useRestoreTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreTask,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: todoKeys.all })
    },
    onError: (err) => toast.error(err.message ?? 'Could not restore task'),
  })
}

// A task can carry any number of links (replaces the single external_url column).
const LINK_COLUMNS = 'id, task_id, url, label, position'

async function nextLinkPosition(taskId) {
  const { data, error } = await supabase
    .from('task_links')
    .select('position')
    .eq('task_id', taskId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return positionAfterLast(data ? [data.position] : [])
}

export async function createTaskLink(values) {
  const position = values.position ?? (await nextLinkPosition(values.task_id))
  const { data, error } = await supabase
    .from('task_links')
    .insert({ ...values, position })
    .select(LINK_COLUMNS)
    .single()
  if (error) throw error
  return data
}

/** Attaches every staged link to a just-created task (`TaskDialog`'s create-mode links). */
export async function createTaskLinks(taskId, links) {
  return Promise.all(
    links.map((l) => createTaskLink({ task_id: taskId, url: l.url, label: l.label })),
  )
}

export async function updateTaskLink(id, patch) {
  const { data, error } = await supabase
    .from('task_links')
    .update(patch)
    .eq('id', id)
    .select(LINK_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function deleteTaskLink(id) {
  const { error } = await supabase.from('task_links').delete().eq('id', id)
  if (error) throw error
}

function useInvalidateTask(taskId) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: taskKeys.lists() })
    qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
  }
}

export function useCreateTaskLinks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, links }) => createTaskLinks(taskId, links),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
    },
    onError: (err) => toast.error(err.message ?? 'Could not add the links'),
  })
}

export function useCreateTaskLink(taskId) {
  const invalidate = useInvalidateTask(taskId)
  return useMutation({
    mutationFn: createTaskLink,
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message ?? 'Could not add the link'),
  })
}

export function useUpdateTaskLink(taskId) {
  const invalidate = useInvalidateTask(taskId)
  return useMutation({
    mutationFn: ({ id, patch }) => updateTaskLink(id, patch),
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message ?? 'Could not save the link'),
  })
}

export function useDeleteTaskLink(taskId) {
  const invalidate = useInvalidateTask(taskId)
  return useMutation({
    mutationFn: deleteTaskLink,
    onSuccess: invalidate,
    onError: (err) => toast.error(err.message ?? 'Could not remove the link'),
  })
}

// Activity: the automatic history (written by the tasks_log_activity trigger) plus manual
// work-log comments. Read oldest first, the way the detail page shows it.
const ACTIVITY_COLUMNS = 'id, kind, from_value, to_value, body, created_at, updated_at'
const ACTIVITY_LIMIT = 200

export async function fetchTaskActivity(taskId) {
  const { data, error } = await supabase
    .from('task_activity')
    .select(ACTIVITY_COLUMNS)
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })
    .limit(ACTIVITY_LIMIT)
  if (error) throw error
  // Newest 200, shown oldest first.
  return data.reverse()
}

export async function addTaskComment({ taskId, body }) {
  const { data, error } = await supabase
    .from('task_activity')
    .insert({ task_id: taskId, kind: 'comment', body: body.trim() })
    .select(ACTIVITY_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateTaskComment(id, body) {
  const { data, error } = await supabase
    .from('task_activity')
    .update({ body: body.trim() })
    .eq('id', id)
    .eq('kind', 'comment')
    .select(ACTIVITY_COLUMNS)
    .single()
  if (error) throw error
  return data
}

/** Hard delete: work-log entries aren't soft-deletable (the UI confirms first). */
export async function deleteTaskComment(id) {
  const { error } = await supabase.from('task_activity').delete().eq('id', id).eq('kind', 'comment')
  if (error) throw error
}

export function useTaskActivity(taskId) {
  return useQuery({
    queryKey: taskKeys.activity(taskId),
    queryFn: () => fetchTaskActivity(taskId),
    enabled: !!taskId,
  })
}

export function useAddTaskComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addTaskComment,
    onSuccess: (_row, { taskId }) => qc.invalidateQueries({ queryKey: taskKeys.activity(taskId) }),
    onError: (err) => toast.error(err.message ?? 'Could not add the entry'),
  })
}

export function useUpdateTaskComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }) => updateTaskComment(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.activities() }),
    onError: (err) => toast.error(err.message ?? 'Could not save the entry'),
  })
}

export function useDeleteTaskComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTaskComment,
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.activities() }),
    onError: (err) => toast.error(err.message ?? 'Could not delete the entry'),
  })
}
