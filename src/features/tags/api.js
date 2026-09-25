import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { noteKeys } from '@/features/notes/api'
import { taskKeys } from '@/features/tasks/api'

export const tagKeys = {
  all: ['tags'],
  lists: () => [...tagKeys.all, 'list'],
  list: (params) => [...tagKeys.lists(), params], // { spaceIds }
}

/**
 * Global tags (space_id null) plus tags scoped to any of `spaceIds`, with usage counts: `count`
 * (tasks) and `note_count`.
 */
export async function fetchTags({ spaceIds }) {
  let query = supabase
    .from('tags')
    .select('id, space_id, name, color, task_tags(count), note_tags(count)')
    .order('name', { ascending: true })
  query = spaceIds?.length
    ? query.or(`space_id.is.null,space_id.in.(${spaceIds.join(',')})`)
    : query.is('space_id', null)
  const { data, error } = await query
  if (error) throw error
  return data.map(({ task_tags, note_tags, ...t }) => ({
    ...t,
    count: task_tags?.[0]?.count ?? 0,
    note_count: note_tags?.[0]?.count ?? 0,
  }))
}

export async function createTag(values) {
  const { data, error } = await supabase
    .from('tags')
    .insert(values)
    .select('id, space_id, name, color')
    .single()
  if (error) throw error
  return { ...data, count: 0, note_count: 0 }
}

export async function updateTag(id, patch) {
  const { data, error } = await supabase
    .from('tags')
    .update(patch)
    .eq('id', id)
    .select('id, space_id, name, color')
    .single()
  if (error) throw error
  return data
}

export async function deleteTag(id) {
  const { error } = await supabase.from('tags').delete().eq('id', id)
  if (error) throw error
}

/**
 * Replaces a task's tags with exactly `tagIds`: removes the rows no longer wanted, then upserts
 * the rest (ignoring ones already there). Lives here rather than `features/tasks/api.js` so it
 * can invalidate `tagKeys` without that module importing back from this one.
 */
export async function setTaskTags(taskId, tagIds) {
  const remove = supabase.from('task_tags').delete().eq('task_id', taskId)
  const { error: removeError } = tagIds.length
    ? await remove.not('tag_id', 'in', `(${tagIds.join(',')})`)
    : await remove
  if (removeError) throw removeError
  if (!tagIds.length) return

  const { error } = await supabase.from('task_tags').upsert(
    tagIds.map((tag_id) => ({ task_id: taskId, tag_id })),
    { onConflict: 'task_id,tag_id', ignoreDuplicates: true },
  )
  if (error) throw error
}

/** Note ↔ tag assignment: the same diff-then-upsert as `setTaskTags`. */
export async function setNoteTags(noteId, tagIds) {
  const remove = supabase.from('note_tags').delete().eq('note_id', noteId)
  const { error: removeError } = tagIds.length
    ? await remove.not('tag_id', 'in', `(${tagIds.join(',')})`)
    : await remove
  if (removeError) throw removeError
  if (!tagIds.length) return

  const { error } = await supabase.from('note_tags').upsert(
    tagIds.map((tag_id) => ({ note_id: noteId, tag_id })),
    { onConflict: 'note_id,tag_id', ignoreDuplicates: true },
  )
  if (error) throw error
}

export function useTags(params) {
  return useQuery({
    queryKey: tagKeys.list(params),
    queryFn: () => fetchTags(params),
    enabled: params.spaceIds?.length > 0,
  })
}

export function useCreateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTag,
    onSuccess: () => qc.invalidateQueries({ queryKey: tagKeys.all }),
    onError: (err) =>
      toast.error(
        err.code === '23505'
          ? 'A tag with this name already exists'
          : (err.message ?? 'Could not create tag'),
      ),
  })
}

export function useUpdateTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateTag(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: noteKeys.all })
    },
    onError: (err) =>
      toast.error(
        err.code === '23505'
          ? 'A tag with this name already exists'
          : (err.message ?? 'Could not save tag'),
      ),
  })
}

/** Hard delete: tags are not soft-deletable. */
export function useDeleteTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteTag,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: tagKeys.all })
      qc.invalidateQueries({ queryKey: taskKeys.all })
      qc.invalidateQueries({ queryKey: noteKeys.all })
    },
    onError: (err) => toast.error(err.message ?? 'Could not delete tag'),
  })
}

/** Task ↔ tag assignment, called after `TaskDialog` saves the task itself. */
export function useSetTaskTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, tagIds }) => setTaskTags(taskId, tagIds),
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
      qc.invalidateQueries({ queryKey: tagKeys.all }) // usage counts
    },
    onError: (err) => toast.error(err.message ?? 'Could not save tags'),
  })
}

/** The editor's tags row: optimistic on the note's detail, so pills appear straight away. */
export function useSetNoteTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ noteId, tagIds }) => setNoteTags(noteId, tagIds),
    onMutate: async ({ noteId, tagIds }) => {
      await qc.cancelQueries({ queryKey: noteKeys.detail(noteId) })
      const detail = qc.getQueryData(noteKeys.detail(noteId))
      if (detail) qc.setQueryData(noteKeys.detail(noteId), { ...detail, tag_ids: tagIds })
      return { detail }
    },
    onError: (err, { noteId }, ctx) => {
      if (ctx?.detail) qc.setQueryData(noteKeys.detail(noteId), ctx.detail)
      toast.error(err.message ?? 'Could not save tags')
    },
    onSettled: (_data, _err, { noteId }) => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
      qc.invalidateQueries({ queryKey: noteKeys.detail(noteId) })
      qc.invalidateQueries({ queryKey: tagKeys.all }) // usage counts
    },
  })
}
