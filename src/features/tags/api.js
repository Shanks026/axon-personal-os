import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { taskKeys } from '@/features/tasks/api'

export const tagKeys = {
  all: ['tags'],
  lists: () => [...tagKeys.all, 'list'],
  list: (params) => [...tagKeys.lists(), params], // { spaceIds }
}

/** Global tags (space_id null) plus tags scoped to any of `spaceIds`, with a usage count. */
export async function fetchTags({ spaceIds }) {
  let query = supabase
    .from('tags')
    .select('id, space_id, name, color, task_tags(count)')
    .order('name', { ascending: true })
  query = spaceIds?.length
    ? query.or(`space_id.is.null,space_id.in.(${spaceIds.join(',')})`)
    : query.is('space_id', null)
  const { data, error } = await query
  if (error) throw error
  return data.map((t) => ({ ...t, count: t.task_tags[0]?.count ?? 0, task_tags: undefined }))
}

export async function createTag(values) {
  const { data, error } = await supabase
    .from('tags')
    .insert(values)
    .select('id, space_id, name, color')
    .single()
  if (error) throw error
  return { ...data, count: 0 }
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
    },
    onError: (err) => toast.error(err.message ?? 'Could not delete tag'),
  })
}

/** Task ↔ tag assignment, called after `TaskDialog` saves the task itself. */
export function useSetTaskTags() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, tagIds }) => setTaskTags(taskId, tagIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: taskKeys.lists() })
      qc.invalidateQueries({ queryKey: tagKeys.all }) // usage counts
    },
    onError: (err) => toast.error(err.message ?? 'Could not save tags'),
  })
}
