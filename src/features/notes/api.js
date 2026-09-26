import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { mergeVersions } from '@/lib/versions'
import { sanitizeSearch } from '@/features/notes/utils'

export const noteKeys = {
  all: ['notes'],
  lists: () => [...noteKeys.all, 'list'],
  list: (params) => [...noteKeys.lists(), params], // { spaceIds, q, tag }
  details: () => [...noteKeys.all, 'detail'],
  detail: (id) => [...noteKeys.details(), id],
  versions: (spaceIds) => [...noteKeys.all, 'versions', spaceIds], // version suggestions
  byIds: (ids) => [...noteKeys.all, 'by-ids', ids], // titles for activity sentences
}

// `excerpt` (generated, 280 chars) keeps list payloads small: never select content_text here.
const LIST_COLUMNS =
  'id, space_id, kind, journal_date, title, excerpt, versions, pinned_at, created_at, updated_at, tag_ids:note_tags(tag_id), link_count:note_task_links(count)'

/**
 * Flattens the embedded `note_tags(tag_id)` rows into a plain `tag_ids: string[]`, and the
 * linked-tasks embed count (list rows only) into `link_count`.
 */
function mapRow(row) {
  return {
    ...row,
    tag_ids: row.tag_ids?.map((t) => t.tag_id) ?? [],
    ...(row.link_count && { link_count: row.link_count[0]?.count ?? 0 }),
  }
}

/**
 * Scoped note list, always newest edit first (design 07a has no sort control). `q` matches the
 * title (substring) or the full text (websearch syntax over title + body). `tag` (any-of) joins
 * `note_tags` a second time under its own alias, so the filter doesn't trim the `tag_ids` a
 * note actually has (the same trick as `fetchTasks`).
 */
export async function fetchNotes({ spaceIds, q, tag = [] }) {
  let query = supabase
    .from('notes')
    .select(tag.length ? `${LIST_COLUMNS}, tag_match:note_tags!inner(tag_id)` : LIST_COLUMNS)
    .in('space_id', spaceIds)
    .eq('kind', 'note') // journal entries (Feature 09) are read through the journal API
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })

  if (tag.length) query = query.in('tag_match.tag_id', tag)

  const term = sanitizeSearch(q)
  if (term) query = query.or(`title.ilike."*${term}*",search.wfts(english)."${term}"`)

  const { data, error } = await query
  if (error) throw error
  return data.map(({ tag_match: _match, ...row }) => mapRow(row))
}

/** One note with its full content. Not scope-filtered: entity routes work in any scope. */
export async function fetchNote(id) {
  const { data, error } = await supabase
    .from('notes')
    .select('*, tag_ids:note_tags(tag_id)')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data ? mapRow(data) : null
}

export async function createNote({ space_id, title = '', content = null, content_text = '' }) {
  const { data, error } = await supabase
    .from('notes')
    .insert({ space_id, title, content, content_text })
    .select('*, tag_ids:note_tags(tag_id)')
    .single()
  if (error) throw error
  return mapRow(data)
}

export async function updateNote(id, patch) {
  const { data, error } = await supabase
    .from('notes')
    .update(patch)
    .eq('id', id)
    .select('*, tag_ids:note_tags(tag_id)')
    .single()
  if (error) throw error
  return mapRow(data)
}

export const softDeleteNote = (id) => updateNote(id, { deleted_at: new Date().toISOString() })
export const restoreNote = (id) => updateNote(id, { deleted_at: null })

/** Hard delete, only for a new note left completely empty (see `NoteEditor`). */
export async function discardNote(id) {
  const { error } = await supabase.from('notes').delete().eq('id', id)
  if (error) throw error
}

/** Every version used on a live note in these spaces, newest first (version suggestions). */
export async function fetchNoteVersions({ spaceIds }) {
  const { data, error } = await supabase
    .from('notes')
    .select('versions')
    .in('space_id', spaceIds)
    .is('deleted_at', null)
    .not('versions', 'eq', '{}')
  if (error) throw error
  return mergeVersions(data.flatMap((r) => r.versions ?? []))
}

export function useNoteVersions({ spaceIds }) {
  return useQuery({
    queryKey: noteKeys.versions(spaceIds),
    queryFn: () => fetchNoteVersions({ spaceIds }),
    enabled: spaceIds?.length > 0,
  })
}

export function useNotes(params) {
  return useQuery({
    queryKey: noteKeys.list(params),
    queryFn: () => fetchNotes(params),
    enabled: params.spaceIds?.length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useNote(id) {
  return useQuery({
    queryKey: noteKeys.detail(id),
    queryFn: () => fetchNote(id),
    enabled: !!id,
  })
}

/** Seeds the detail cache with the new row, so the editor opens without a fetch. */
export function useCreateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createNote,
    onSuccess: (row) => {
      qc.setQueryData(noteKeys.detail(row.id), row)
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
    onError: (err) => toast.error(err.message ?? 'Could not create note'),
  })
}

/**
 * Autosave patches (title, content, content_text). Not optimistic: the editor holds its own
 * state. Errors surface in the save indicator, not as toasts.
 */
export function useUpdateNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }) => updateNote(id, patch),
    onSuccess: (row) => {
      qc.setQueryData(noteKeys.detail(row.id), (old) => (old ? { ...old, ...row } : row))
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}

/** The editor's versions row: optimistic on the note's detail, so badges appear straight away. */
export function useSetNoteVersions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, versions }) => updateNote(id, { versions }),
    onMutate: async ({ id, versions }) => {
      await qc.cancelQueries({ queryKey: noteKeys.detail(id) })
      const detail = qc.getQueryData(noteKeys.detail(id))
      if (detail) qc.setQueryData(noteKeys.detail(id), { ...detail, versions })
      return { detail }
    },
    onError: (err, { id }, ctx) => {
      if (ctx?.detail) qc.setQueryData(noteKeys.detail(id), ctx.detail)
      toast.error(err.message ?? 'Could not save versions')
    },
    onSettled: (_row, _err, { id }) => {
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
      qc.invalidateQueries({ queryKey: noteKeys.detail(id) })
      qc.invalidateQueries({ queryKey: [...noteKeys.all, 'versions'] })
    },
  })
}

/** Pin or unpin, optimistically in every cached list and the detail. */
export function useTogglePinNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, pinned }) =>
      updateNote(id, { pinned_at: pinned ? new Date().toISOString() : null }),
    onMutate: async ({ id, pinned }) => {
      await qc.cancelQueries({ queryKey: noteKeys.all })
      const lists = qc.getQueriesData({ queryKey: noteKeys.lists() })
      const detail = qc.getQueryData(noteKeys.detail(id))
      const pinned_at = pinned ? new Date().toISOString() : null
      qc.setQueriesData({ queryKey: noteKeys.lists() }, (old) =>
        old?.map((n) => (n.id === id ? { ...n, pinned_at } : n)),
      )
      if (detail) qc.setQueryData(noteKeys.detail(id), { ...detail, pinned_at })
      return { lists, detail }
    },
    onError: (err, { id }, ctx) => {
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data))
      if (ctx?.detail) qc.setQueryData(noteKeys.detail(id), ctx.detail)
      toast.error(err.message ?? 'Could not update note')
    },
    onSettled: () => qc.invalidateQueries({ queryKey: noteKeys.all }),
  })
}

/** Soft delete (to Trash), removed from cached lists straight away. */
export function useDeleteNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: softDeleteNote,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: noteKeys.lists() })
      const lists = qc.getQueriesData({ queryKey: noteKeys.lists() })
      qc.setQueriesData({ queryKey: noteKeys.lists() }, (old) => old?.filter((n) => n.id !== id))
      return { lists }
    },
    onError: (err, _id, ctx) => {
      ctx?.lists.forEach(([key, data]) => qc.setQueryData(key, data))
      toast.error(err.message ?? 'Could not delete note')
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      qc.invalidateQueries({ queryKey: ['links'] }) // linkKeys.all: tasks' linked-notes panels
    },
  })
}

export function useRestoreNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreNote,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: noteKeys.all })
      qc.invalidateQueries({ queryKey: ['links'] }) // linkKeys.all
    },
    onError: (err) => toast.error(err.message ?? 'Could not restore note'),
  })
}

/** Silent: runs as the editor unmounts, when there's no UI left to show an error in. */
export function useDiscardNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: discardNote,
    onSuccess: (_data, id) => {
      qc.removeQueries({ queryKey: noteKeys.detail(id) })
      qc.invalidateQueries({ queryKey: noteKeys.lists() })
    },
    onError: (err) => console.error('Could not discard empty note', err),
  })
}

/** Titles (and Trash state) for a set of notes: the task activity's "Linked note '…'" lines. */
export async function fetchNotesByIds(ids) {
  const { data, error } = await supabase.from('notes').select('id, title, deleted_at').in('id', ids)
  if (error) throw error
  return data
}

export function useNotesByIds(ids) {
  return useQuery({
    queryKey: noteKeys.byIds(ids),
    queryFn: () => fetchNotesByIds(ids),
    enabled: ids?.length > 0,
  })
}
