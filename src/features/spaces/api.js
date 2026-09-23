import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/context/AuthContext'

export const spaceKeys = {
  all: ['spaces'],
  list: () => [...spaceKeys.all, 'list'],
}

// One list with every space (archived included): it's small and needed everywhere.
export async function fetchSpaces() {
  const { data, error } = await supabase
    .from('spaces')
    .select('*')
    .order('position', { ascending: true })
  if (error) throw error
  return data
}

export async function createSpace(values) {
  const { data, error } = await supabase.from('spaces').insert(values).select().single()
  if (error) throw error
  return data
}

export async function updateSpace(id, patch) {
  const { data, error } = await supabase.from('spaces').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

/** Hard delete. Everything inside the space cascades in the database. */
export async function deleteSpace(id) {
  const { error } = await supabase.from('spaces').delete().eq('id', id)
  if (error) throw error
}

/** Remember the last opened space (fire-and-forget; failures only warn). */
export async function setLastSpace(userId, spaceId) {
  const { error } = await supabase
    .from('profiles')
    .update({ last_space_id: spaceId })
    .eq('id', userId)
  if (error) console.warn('Could not remember last space', error)
}

/** A friendlier message for the unique (user_id, slug) constraint. */
export function isDuplicateSlugError(err) {
  return err?.code === '23505' && /slug/.test(err?.message ?? '')
}

export function useSpaces() {
  const { user } = useAuth()
  return useQuery({
    queryKey: spaceKeys.list(),
    queryFn: fetchSpaces,
    enabled: !!user,
  })
}

export function useCreateSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createSpace,
    onSuccess: (row) => {
      qc.setQueryData(spaceKeys.list(), (old) => (old ? [...old, row] : [row]))
      qc.invalidateQueries({ queryKey: spaceKeys.all })
    },
    onError: (err) => {
      if (!isDuplicateSlugError(err)) toast.error(err.message ?? 'Could not create space')
    },
  })
}

/** Optimistic: reorder, archive and edits apply instantly and roll back on error. */
export function useUpdateSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateSpace(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: spaceKeys.list() })
      const previous = qc.getQueryData(spaceKeys.list())
      qc.setQueryData(spaceKeys.list(), (old) =>
        old
          ?.map((s) => (s.id === id ? { ...s, ...patch } : s))
          .sort((a, b) => a.position - b.position),
      )
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(spaceKeys.list(), ctx.previous)
      if (!isDuplicateSlugError(err)) toast.error(err.message ?? 'Could not update space')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: spaceKeys.all }),
  })
}

export function useDeleteSpace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteSpace,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: spaceKeys.list() })
      const previous = qc.getQueryData(spaceKeys.list())
      qc.setQueryData(spaceKeys.list(), (old) => old?.filter((s) => s.id !== id))
      return { previous }
    },
    onError: (err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(spaceKeys.list(), ctx.previous)
      toast.error(err.message ?? 'Could not delete space')
    },
    // Every feature's rows cascade with the space, so refresh everything.
    onSettled: () => qc.invalidateQueries(),
  })
}

export function useSetLastSpace() {
  const { user } = useAuth()
  return (spaceId) => (user ? setLastSpace(user.id, spaceId) : undefined)
}
