import { useCallback } from 'react'
import { useUpdateEvent } from '@/features/calendar/api'
import { applyMove, applyResize, rescheduleTask } from '@/features/calendar/utils'
import { useQuickUpdateTask } from '@/features/tasks/api'

/**
 * What a drop does, for the Month and time-grid views. Every change is optimistic (the event and
 * task mutation hooks patch the cache first and roll back on error).
 */
export function useCalendarDragActions(timeZone) {
  const { mutate: updateEvent } = useUpdateEvent()
  const { mutate: updateTask } = useQuickUpdateTask()

  const moveEvent = useCallback(
    (event, delta) => {
      if (!delta.dayDelta && !delta.minuteDelta) return
      updateEvent({ id: event.id, patch: applyMove(event, delta, timeZone) })
    },
    [updateEvent, timeZone],
  )
  const resizeEvent = useCallback(
    (event, minuteDelta) => {
      if (!minuteDelta) return
      updateEvent({ id: event.id, patch: applyResize(event, minuteDelta) })
    },
    [updateEvent],
  )
  const moveTask = useCallback(
    (task, isoDate) => {
      if (task.due_date === isoDate) return
      updateTask({ id: task.id, patch: rescheduleTask(task, isoDate) })
    },
    [updateTask],
  )

  return { moveEvent, resizeEvent, moveTask }
}
