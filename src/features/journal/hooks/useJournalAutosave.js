import { useCallback, useRef, useState } from 'react'
import { useAutosave } from '@/hooks/useAutosave'
import { useSyncNoteMentions } from '@/features/links/api'
import { collectTaskMentionIds, sameIds } from '@/features/links/utils'
import { useSaveJournalEntry } from '@/features/journal/api'
import { JOURNAL_AUTOSAVE_DELAY } from '@/features/journal/constants'

/**
 * Autosave for one day's entry (mount it per `spaceId` + `date`). The first save creates the row;
 * `useAutosave` runs saves one at a time, so edits typed while it's inserting queue behind it and
 * then update the created row (the id lives in a ref): fast typing never inserts twice. After a
 * content save, the entry's `[[task]]` mention links are reconciled when the set changed.
 * @returns {{ onChange: (json, text) => void, flush: () => Promise<void>, status: 'idle' | 'saving' | 'saved' | 'error' }}
 */
export function useJournalAutosave({ entry, spaceId, date }) {
  const save = useSaveJournalEntry()
  const syncMentions = useSyncNoteMentions()
  const entryId = useRef(entry?.id ?? null)
  const [initialMentions] = useState(() => collectTaskMentionIds(entry?.content))
  const lastSynced = useRef(initialMentions)

  const { schedule, flush, status } = useAutosave({
    save: async ({ content, content_text }) => {
      const row = await save.mutateAsync({
        entryId: entryId.current,
        spaceId,
        date,
        content,
        content_text,
      })
      entryId.current = row.id
      const ids = collectTaskMentionIds(content)
      if (!sameIds(ids, lastSynced.current)) {
        await syncMentions.mutateAsync({ noteId: row.id, taskIds: ids })
        lastSynced.current = ids
      }
      return row
    },
    delay: JOURNAL_AUTOSAVE_DELAY,
  })

  const onChange = useCallback(
    (content, content_text) => schedule({ content, content_text }),
    [schedule],
  )

  return { onChange, flush, status }
}
