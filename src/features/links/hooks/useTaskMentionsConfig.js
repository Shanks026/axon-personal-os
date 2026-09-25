import { useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { textClasses } from '@/lib/tint'
import { useSpace } from '@/context/SpaceContext'
import { TaskMentionChip } from '@/features/links/components/TaskMentionChip'
import { createTask, searchTasks, taskKeys } from '@/features/tasks/api'
import { TASK_STATUS_MAP } from '@/features/tasks/constants'

/**
 * The editor's `features.taskMentions` for a note: `search(query)` (the note's space, or every
 * active space in Global; open tasks first), `create(title)` (a new task in the note's space) and
 * the chip `NodeView`. Results carry their status icon and, in Global, the space name as a hint,
 * so the editor itself never imports task code.
 */
export function useTaskMentionsConfig(note) {
  const qc = useQueryClient()
  const { isGlobal, scopeSpaceIds, spaceById } = useSpace()

  return useMemo(() => {
    const spaceIds = isGlobal ? scopeSpaceIds : [note.space_id]
    return {
      search: async (query) => {
        const params = { spaceIds, q: query }
        const tasks = await qc.fetchQuery({
          queryKey: taskKeys.search(params),
          queryFn: () => searchTasks(params),
          staleTime: 10_000,
        })
        return tasks.map((t) => {
          const s = TASK_STATUS_MAP[t.status] ?? TASK_STATUS_MAP.todo
          return {
            id: t.id,
            label: t.title,
            icon: s.icon,
            iconClassName: textClasses(s.color),
            hint: isGlobal ? spaceById.get(t.space_id)?.name : undefined,
          }
        })
      },
      create: async (title) => {
        const task = await createTask({ space_id: note.space_id, title })
        qc.invalidateQueries({ queryKey: taskKeys.lists() })
        qc.invalidateQueries({ queryKey: [...taskKeys.all, 'search'] })
        return { id: task.id, label: task.title }
      },
      NodeView: TaskMentionChip,
    }
  }, [qc, isGlobal, scopeSpaceIds, spaceById, note.space_id])
}
