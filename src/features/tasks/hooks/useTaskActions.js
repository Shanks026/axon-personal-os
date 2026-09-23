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

  const remove = useCallback(
    (task) =>
      del.mutate(task.id, {
        onSuccess: () =>
          toast('Task moved to Trash', {
            description: task.title,
            action: { label: 'Undo', onClick: () => restore.mutate(task.id) },
          }),
      }),
    [del, restore],
  )

  return { setField, remove }
}
