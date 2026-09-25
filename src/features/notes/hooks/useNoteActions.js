import { useCallback } from 'react'
import { toast } from 'sonner'
import { useDeleteNote, useRestoreNote, useTogglePinNote } from '@/features/notes/api'

/** Shared card, row and editor actions: pin toggle, and delete with an Undo toast. */
export function useNoteActions() {
  const pin = useTogglePinNote()
  const del = useDeleteNote()
  const restore = useRestoreNote()

  const togglePin = useCallback(
    (note) => pin.mutate({ id: note.id, pinned: !note.pinned_at }),
    [pin],
  )

  const remove = useCallback(
    (note, { onDeleted } = {}) =>
      del.mutate(note.id, {
        onSuccess: () => {
          onDeleted?.()
          toast('Note moved to Trash', {
            description: note.title || 'Untitled',
            action: { label: 'Undo', onClick: () => restore.mutate(note.id) },
          })
        },
      }),
    [del, restore],
  )

  return { togglePin, remove }
}
