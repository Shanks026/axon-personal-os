import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'

export const inboxKeys = {
  all: ['inbox'],
  lists: () => [...inboxKeys.all, 'list'],
  list: (params) => [...inboxKeys.lists(), params], // { spaceIds, includeUnsorted }
  counts: () => [...inboxKeys.all, 'count'],
  count: (params) => [...inboxKeys.counts(), params],
  triaged: (params) => [...inboxKeys.all, 'triaged', params], // { spaceIds, includeUnsorted, since }
}

const ITEM_COLUMNS =
  'id, space_id, body, source, processed_at, processed_as, processed_ref, created_at'

/** Scope filter: the spaces, plus Unsorted (`space_id` null) in Global. */
function applyScope(query, { spaceIds, includeUnsorted }) {
  return includeUnsorted
    ? query.or(`space_id.in.(${spaceIds.join(',')}),space_id.is.null`)
    : query.in('space_id', spaceIds)
}

/** Open (unprocessed) items in scope, newest first. */
export async function fetchInboxItems(params) {
  const { data, error } = await applyScope(
    supabase
      .from('inbox_items')
      .select(ITEM_COLUMNS)
      .is('processed_at', null)
      .order('created_at', { ascending: false }),
    params,
  )
  if (error) throw error
  return data
}

export async function fetchInboxCount(params) {
  const { count, error } = await applyScope(
    supabase
      .from('inbox_items')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null),
    params,
  )
  if (error) throw error
  return count ?? 0
}

/** Items processed since `since` (an ISO instant: local midnight), for "You triaged N today". */
export async function fetchTriagedCount({ since, ...params }) {
  const { count, error } = await applyScope(
    supabase
      .from('inbox_items')
      .select('id', { count: 'exact', head: true })
      .gte('processed_at', since),
    params,
  )
  if (error) throw error
  return count ?? 0
}

export async function captureItem({ body, space_id }) {
  const { data, error } = await supabase
    .from('inbox_items')
    .insert({ body, space_id })
    .select(ITEM_COLUMNS)
    .single()
  if (error) throw error
  return data
}

async function updateItem(id, patch) {
  const { data, error } = await supabase
    .from('inbox_items')
    .update(patch)
    .eq('id', id)
    .select(ITEM_COLUMNS)
    .single()
  if (error) throw error
  return data
}

export const processItem = (id, { as, ref = null }) =>
  updateItem(id, { processed_at: new Date().toISOString(), processed_as: as, processed_ref: ref })
export const discardItem = (id) => processItem(id, { as: 'discarded' })
export const moveItem = (id, spaceId) => updateItem(id, { space_id: spaceId })
export const restoreItem = (id) =>
  updateItem(id, { processed_at: null, processed_as: null, processed_ref: null })

/** Several items at once (the bulk bar): one request each for discard, move and restore. */
async function updateItems(ids, patch) {
  const { error } = await supabase.from('inbox_items').update(patch).in('id', ids)
  if (error) throw error
}
export const discardItems = (ids) =>
  updateItems(ids, {
    processed_at: new Date().toISOString(),
    processed_as: 'discarded',
    processed_ref: null,
  })
export const moveItems = (ids, spaceId) => updateItems(ids, { space_id: spaceId })
export const restoreItems = (ids) =>
  updateItems(ids, { processed_at: null, processed_as: null, processed_ref: null })

/** What was handled in the last 30 days (`since`), newest first: the Processed tab. */
export async function fetchProcessedItems({ since, ...params }) {
  const { data, error } = await applyScope(
    supabase
      .from('inbox_items')
      .select(ITEM_COLUMNS)
      .not('processed_at', 'is', null)
      .gte('processed_at', since)
      .order('processed_at', { ascending: false })
      .limit(200),
    params,
  )
  if (error) throw error
  return data
}

export function useInboxItems(params) {
  return useQuery({
    queryKey: inboxKeys.list(params),
    queryFn: () => fetchInboxItems(params),
    enabled: params.spaceIds?.length > 0,
  })
}

export function useProcessedItems(params) {
  return useQuery({
    queryKey: inboxKeys.list({ ...params, tab: 'processed' }),
    queryFn: () => fetchProcessedItems(params),
    enabled: params.spaceIds?.length > 0 && !!params.since,
  })
}

export function useInboxCount(params) {
  return useQuery({
    queryKey: inboxKeys.count(params),
    queryFn: () => fetchInboxCount(params),
    enabled: params.spaceIds?.length > 0,
    staleTime: 60_000,
  })
}

export function useTriagedCount(params) {
  return useQuery({
    queryKey: inboxKeys.triaged(params),
    queryFn: () => fetchTriagedCount(params),
    enabled: params.spaceIds?.length > 0 && !!params.since,
  })
}

export function useCaptureItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: captureItem,
    onSuccess: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not capture that'),
  })
}

/**
 * Takes an item out of every cached list and count straight away (process, discard, or a move
 * out of the viewed space), rolling back on error. `patchRow(vars, params)` lets a move within a list that still covers the item (Global)
 * patch the row instead of removing it.
 */
function useOptimisticRemoval(mutationFn, { patchRow, errorMessage }) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn,
    onMutate: async (vars) => {
      const ids = vars.ids ?? [vars.id]
      await qc.cancelQueries({ queryKey: inboxKeys.all })
      const lists = qc.getQueriesData({ queryKey: inboxKeys.lists() })
      const counts = qc.getQueriesData({ queryKey: inboxKeys.counts() })
      for (const [key, rows] of lists) {
        if (!rows) continue
        const params = key[2]
        const patched = patchRow?.(vars, params)
        qc.setQueryData(
          key,
          patched
            ? rows.map((r) => (ids.includes(r.id) ? { ...r, ...patched } : r))
            : rows.filter((r) => !ids.includes(r.id)),
        )
      }
      for (const [key, n] of counts) {
        const params = key[2]
        if (typeof n === 'number' && !patchRow?.(vars, params))
          qc.setQueryData(key, Math.max(0, n - ids.length))
      }
      return { lists, counts }
    },
    onError: (err, _vars, ctx) => {
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data))
      ctx?.counts.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? errorMessage)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
  })
}

/** `{ id, as, ref }`: the item became a task, todo, note or event (`ref` = its id). */
export function useProcessItem() {
  return useOptimisticRemoval(({ id, as, ref }) => processItem(id, { as, ref }), {
    errorMessage: 'Could not update the inbox item',
  })
}

/** `{ id }`: discard (reversible with `useRestoreItem`). */
export function useDiscardItem() {
  return useOptimisticRemoval(({ id }) => discardItem(id), {
    errorMessage: 'Could not discard the item',
  })
}

/**
 * `{ id, spaceId }` (`null` = Unsorted). The row leaves a list whose scope no longer includes it
 * (a space's inbox); a list that still covers the target (Global) just updates its space.
 */
export function useMoveItem() {
  return useOptimisticRemoval(({ id, spaceId }) => moveItem(id, spaceId), {
    patchRow: ({ spaceId }, params) => {
      const stays = spaceId ? params?.spaceIds?.includes(spaceId) : params?.includeUnsorted
      return stays ? { space_id: spaceId } : null
    },
    errorMessage: 'Could not move the item',
  })
}

export function useRestoreItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreItem,
    onSettled: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not restore the item'),
  })
}

/** `{ ids }`: discard several at once (Undo with `useRestoreItems`). */
export function useDiscardItems() {
  return useOptimisticRemoval(({ ids }) => discardItems(ids), {
    errorMessage: 'Could not discard the items',
  })
}

/** `{ ids, spaceId }`: move several at once (`null` = Unsorted), like `useMoveItem`. */
export function useMoveItems() {
  return useOptimisticRemoval(({ ids, spaceId }) => moveItems(ids, spaceId), {
    patchRow: ({ spaceId }, params) => {
      const stays = spaceId ? params?.spaceIds?.includes(spaceId) : params?.includeUnsorted
      return stays ? { space_id: spaceId } : null
    },
    errorMessage: 'Could not move the items',
  })
}

export function useRestoreItems() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreItems,
    onSettled: () => qc.invalidateQueries({ queryKey: inboxKeys.all }),
    onError: (err) => toast.error(err.message ?? 'Could not restore the items'),
  })
}
