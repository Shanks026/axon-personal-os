import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { linkKeys } from '@/features/links/api'
import { restoreNote, softDeleteNote, updateNote } from '@/features/notes/api'
import { journalTitle } from '@/features/journal/utils'

// A journal entry is a note (`kind = 'journal'`, one live row per space and `journal_date`).
export const journalKeys = {
  all: ['journal'],
  entry: (params) => [...journalKeys.all, 'entry', params], // { spaceId, date }
  day: (params) => [...journalKeys.all, 'day', params], // { spaceIds, date }
  dates: (params) => [...journalKeys.all, 'dates', params], // { spaceIds, from, to }
}

const UNIQUE_VIOLATION = '23505'

/** One space's live entry for a day, or `null` when nothing is written yet. */
export async function fetchJournalEntry({ spaceId, date }) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('kind', 'journal')
    .eq('space_id', spaceId)
    .eq('journal_date', date)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Every scoped space's live entry for a day (Global's stacked view). */
export async function fetchJournalDay({ spaceIds, date }) {
  const { data, error } = await supabase
    .from('notes')
    .select('*')
    .eq('kind', 'journal')
    .in('space_id', spaceIds)
    .eq('journal_date', date)
    .is('deleted_at', null)
  if (error) throw error
  return data
}

/** `{ space_id, journal_date }` of the live entries between `from` and `to` (inclusive). */
export async function fetchJournalDates({ spaceIds, from, to }) {
  const { data, error } = await supabase
    .from('notes')
    .select('space_id, journal_date')
    .eq('kind', 'journal')
    .in('space_id', spaceIds)
    .gte('journal_date', from)
    .lte('journal_date', to)
    .is('deleted_at', null)
  if (error) throw error
  return data
}

/**
 * The day's entry, created on first save. A unique violation means another tab created it
 * first: that row is re-read and gets this content instead.
 */
export async function getOrCreateJournalEntry({ spaceId, date, content, content_text }) {
  const existing = await fetchJournalEntry({ spaceId, date })
  if (existing) return updateNote(existing.id, { content, content_text })

  const { data, error } = await supabase
    .from('notes')
    .insert({
      space_id: spaceId,
      kind: 'journal',
      journal_date: date,
      title: journalTitle(date),
      content,
      content_text,
    })
    .select('*')
    .single()
  if (error?.code === UNIQUE_VIOLATION) {
    const winner = await fetchJournalEntry({ spaceId, date })
    return updateNote(winner.id, { content, content_text })
  }
  if (error) throw error
  return data
}

/** Restores a cleared entry; a newer live entry for that day blocks it with a readable error. */
export async function restoreJournalEntry(id) {
  try {
    return await restoreNote(id)
  } catch (err) {
    if (err?.code === UNIQUE_VIOLATION) {
      throw new Error(
        'An entry for this day already exists — open it and copy what you need from Trash',
      )
    }
    throw err
  }
}

export function useJournalEntry({ spaceId, date }) {
  return useQuery({
    queryKey: journalKeys.entry({ spaceId, date }),
    queryFn: () => fetchJournalEntry({ spaceId, date }),
    enabled: !!spaceId && !!date,
  })
}

export function useJournalDay({ spaceIds, date }) {
  return useQuery({
    queryKey: journalKeys.day({ spaceIds, date }),
    queryFn: () => fetchJournalDay({ spaceIds, date }),
    enabled: spaceIds?.length > 0 && !!date,
  })
}

export function useJournalDates({ spaceIds, from, to }) {
  return useQuery({
    queryKey: journalKeys.dates({ spaceIds, from, to }),
    queryFn: () => fetchJournalDates({ spaceIds, from, to }),
    enabled: spaceIds?.length > 0 && !!from && !!to,
    placeholderData: keepPreviousData,
  })
}

/**
 * Autosave: updates the entry, or creates it on the first save of the day. Not optimistic (the
 * editor holds its own state); errors show in the save indicator, not as toasts.
 */
export function useSaveJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entryId, spaceId, date, content, content_text }) =>
      entryId
        ? updateNote(entryId, { content, content_text })
        : getOrCreateJournalEntry({ spaceId, date, content, content_text }),
    onSuccess: (row, { entryId, spaceId, date }) => {
      qc.setQueryData(journalKeys.entry({ spaceId, date }), row)
      if (!entryId) {
        qc.invalidateQueries({ queryKey: [...journalKeys.all, 'dates'] })
        qc.invalidateQueries({ queryKey: [...journalKeys.all, 'day'] })
      }
    },
  })
}

export function useRestoreJournalEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreJournalEntry,
    onSettled: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all })
      qc.invalidateQueries({ queryKey: linkKeys.all })
    },
    onError: (err) => toast.error(err.message ?? 'Could not restore the entry'),
  })
}

/**
 * Clear entry: soft delete (to Trash) with an Undo toast. The day's cached entry is set straight
 * away (`null`, or the restored row on Undo) and `onReset` fires, so the page can remount its
 * editor on the new state (the editor reads its content once, on mount).
 */
export function useClearJournalEntry({ onReset } = {}) {
  const qc = useQueryClient()
  const restore = useRestoreJournalEntry()
  return useMutation({
    mutationFn: (entry) => softDeleteNote(entry.id),
    onSuccess: (_row, entry) => {
      const key = journalKeys.entry({ spaceId: entry.space_id, date: entry.journal_date })
      qc.setQueryData(key, null)
      onReset?.()
      toast('Entry cleared', {
        description: entry.title,
        action: {
          label: 'Undo',
          onClick: () =>
            restore.mutate(entry.id, {
              onSuccess: (row) => {
                qc.setQueryData(key, row)
                onReset?.()
              },
            }),
        },
      })
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: journalKeys.all })
      qc.invalidateQueries({ queryKey: linkKeys.all })
    },
    onError: (err) => toast.error(err.message ?? 'Could not clear the entry'),
  })
}
