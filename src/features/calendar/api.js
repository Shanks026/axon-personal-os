import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export const eventKeys = {
  all: ['events'],
  lists: () => [...eventKeys.all, 'list'],
  list: (params) => [...eventKeys.lists(), params], // { spaceIds, from, to }
  details: () => [...eventKeys.all, 'detail'],
  detail: (id) => [...eventKeys.details(), id],
}

// The description is small (≤ 5000 characters) and the dialog opens straight from a chip, so the
// list carries it too: no second fetch before the dialog can show.
const EVENT_COLUMNS =
  'id, space_id, title, description, location, url, starts_at, ends_at, all_day, task_id, note_id, updated_at'

/**
 * Events overlapping `[from, to)` (UTC ISO strings) in the given spaces: those starting before
 * `to` and ending at or after `from`.
 */
export async function fetchEvents({ spaceIds, from, to }) {
  const { data, error } = await supabase
    .from('events')
    .select(EVENT_COLUMNS)
    .in('space_id', spaceIds)
    .is('deleted_at', null)
    .lt('starts_at', to)
    .gte('ends_at', from)
    .order('starts_at')
  if (error) throw error
  return data
}

/** One event (any scope: deep links can point anywhere). Null when missing or in Trash. */
export async function fetchEvent(id) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function createEvent(values) {
  const { data, error } = await supabase
    .from('events')
    .insert(values)
    .select(EVENT_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export async function updateEvent(id, patch) {
  const { data, error } = await supabase
    .from('events')
    .update(patch)
    .eq('id', id)
    .select(EVENT_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export const softDeleteEvent = (id) => updateEvent(id, { deleted_at: new Date().toISOString() })
export const restoreEvent = (id) => updateEvent(id, { deleted_at: null })

export function useEvents(params) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => fetchEvents(params),
    enabled: params.spaceIds?.length > 0 && !!params.from && !!params.to,
    // Moving between months keeps the old grid's chips until the new ones land (no skeleton flash).
    placeholderData: keepPreviousData,
  })
}

export function useEvent(id) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => fetchEvent(id),
    enabled: !!id,
  })
}

export function useCreateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createEvent,
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not create event'),
  })
}

/**
 * Optimistic: the patch lands in every cached range at once (drag moves and resizes feel instant),
 * rolls back with a toast on error, and the lists refetch when it settles.
 */
export function useUpdateEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateEvent(id, patch),
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: eventKeys.lists() })
      const snapshots = qc.getQueriesData({ queryKey: eventKeys.lists() })
      qc.setQueriesData({ queryKey: eventKeys.lists() }, (old) =>
        old?.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      )
      return { snapshots }
    },
    onSuccess: (row) => {
      qc.setQueryData(eventKeys.detail(row.id), (old) => (old ? { ...old, ...row } : old))
    },
    onError: (err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not save event')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: eventKeys.lists() }),
  })
}

/** Soft delete (to Trash). The chip disappears at once; the caller shows the Undo toast. */
export function useDeleteEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: softDeleteEvent,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: eventKeys.lists() })
      const snapshots = qc.getQueriesData({ queryKey: eventKeys.lists() })
      qc.setQueriesData({ queryKey: eventKeys.lists() }, (old) => old?.filter((e) => e.id !== id))
      return { snapshots }
    },
    onError: (err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not delete event')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
  })
}

/** Undo toast and Trash (Feature 14). */
export function useRestoreEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreEvent,
    onSettled: () => qc.invalidateQueries({ queryKey: eventKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not restore event'),
  })
}
