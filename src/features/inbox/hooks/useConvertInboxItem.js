import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { entityPath } from '@/lib/entityPaths'
import { useSpace } from '@/context/SpaceContext'
import { useDefaultSpaceId } from '@/hooks/useDefaultSpaceId'
import { inboxKeys, processItem } from '@/features/inbox/api'
import { captureToNote, splitCapture } from '@/features/inbox/utils'
import { createNote, noteKeys } from '@/features/notes/api'
import { usePreferences } from '@/features/settings/api'
import { createTodo, todoKeys } from '@/features/todos/api'

const LABELS = { todo: 'Todo', note: 'Note' }

/**
 * `convert(item, 'todo' | 'note')`: creates the entity in the item's space (an Unsorted item goes
 * to the default space: no pickers), then marks the item processed with its id. The two writes
 * aren't atomic: if the second fails, the entity stays and the toast says the item couldn't be
 * updated. Tasks and events convert through their dialogs instead (`onSuccess(row)`).
 */
export function useConvertInboxItem() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { spaceById } = useSpace()
  const { timezone } = usePreferences()
  const defaultSpaceId = useDefaultSpaceId()

  return useCallback(
    async (item, as) => {
      const spaceId = item.space_id ?? defaultSpaceId
      let row
      try {
        row =
          as === 'todo'
            ? await createTodo({ title: splitCapture(item.body).title, space_id: spaceId })
            : await createNote({ ...captureToNote(item.body), space_id: spaceId })
      } catch (err) {
        toast.error(err.message ?? `Could not create the ${as}`)
        return
      }
      qc.invalidateQueries({ queryKey: as === 'todo' ? todoKeys.all : noteKeys.all })
      const to = entityPath(
        { entity_type: as, id: row.id, space_id: row.space_id },
        { slugFor: (id) => spaceById.get(id)?.slug, timezone },
      )
      try {
        await processItem(item.id, { as, ref: row.id })
        qc.invalidateQueries({ queryKey: inboxKeys.all })
        toast.success(`${LABELS[as]} created`, {
          action: { label: 'Open', onClick: () => navigate(to) },
        })
      } catch {
        qc.invalidateQueries({ queryKey: inboxKeys.all })
        toast.error(`${LABELS[as]} created, but the inbox item couldn’t be updated`, {
          action: { label: 'Open', onClick: () => navigate(to) },
        })
      }
    },
    [defaultSpaceId, qc, spaceById, timezone, navigate],
  )
}
