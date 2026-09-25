import { useMemo } from 'react'
import { useEvents } from '@/features/calendar/api'
import { useTasks } from '@/features/tasks/api'
import { useTodos } from '@/features/todos/api'

/**
 * Everything the calendar shows for `range`, as one typed list:
 * `{ kind: 'event' | 'task' | 'todo', id, space_id, title, raw, ... }`. Events carry `start`,
 * `end` and `allDay`; tasks and todos carry `dueDate` and `done`. Cancelled tasks are left out.
 * The task and todo queries only run while their layer is on.
 */
export function useCalendarItems({ spaceIds, range, layers }) {
  const events = useEvents({ spaceIds, from: range.from, to: range.to })
  const due = { spaceIds, dueFrom: range.startDate, dueTo: range.endDate }
  const tasks = useTasks(due, { enabled: layers.tasks })
  const todos = useTodos(due, { enabled: layers.todos })

  const items = useMemo(() => {
    const out = (events.data ?? []).map((e) => ({
      kind: 'event',
      id: e.id,
      space_id: e.space_id,
      title: e.title,
      start: e.starts_at,
      end: e.ends_at,
      allDay: e.all_day,
      raw: e,
    }))
    if (layers.tasks) {
      for (const t of tasks.data ?? []) {
        if (t.status === 'cancelled' || !t.due_date) continue
        out.push({
          kind: 'task',
          id: t.id,
          space_id: t.space_id,
          title: t.title,
          dueDate: t.due_date,
          done: t.status === 'done',
          raw: t,
        })
      }
    }
    if (layers.todos) {
      for (const t of todos.data ?? []) {
        if (!t.due_date) continue
        out.push({
          kind: 'todo',
          id: t.id,
          space_id: t.space_id,
          title: t.title,
          dueDate: t.due_date,
          done: t.is_done,
          raw: t,
        })
      }
    }
    return out
  }, [events.data, tasks.data, todos.data, layers.tasks, layers.todos])

  const parts = [events, layers.tasks && tasks, layers.todos && todos].filter(Boolean)
  return {
    items,
    isLoading: parts.some((q) => q.isLoading),
    error: parts.find((q) => q.error)?.error ?? null,
    refetch: () => parts.forEach((q) => q.refetch()),
  }
}
