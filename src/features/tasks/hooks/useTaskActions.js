import { useCallback } from 'react'
import { toast } from 'sonner'
import { useDeleteTask, useQuickUpdateTask, useRestoreTask } from '@/features/tasks/api'

/** Shared card/row actions: optimistic quick edits, and delete with an Undo toast. */
export function useTaskActions() {
  const quick = useQuickUpdateTask()
  const del = useDeleteTask()
  const restore = useRestoreTask()

  const setField = useCallback(
    (task, field, value) => {
      if (task[field] !== value) quick.mutate({ id: task.id, patch: { [field]: value } })
    },
    [quick],
  )

  // `onDeleted` runs before the Undo toast (the detail page navigates back to the list).
  const remove = useCallback(
    (task, { onDeleted } = {}) =>
      del.mutate(task.id, {
        onSuccess: () => {
          onDeleted?.()
          toast('Task moved to Trash', {
            description: task.title,
            action: { label: 'Undo', onClick: () => restore.mutate(task.id) },
          })
        },
      }),
    [del, restore],
  )

  return { setField, remove }
}
