import { CornerDownRight } from 'lucide-react'
import { Link } from 'react-router'
import { paths } from '@/lib/paths'
import { TaskStatusIcon } from '@/features/tasks/components/TaskPills'

/** "↳ {task title}" chip on a checklist todo (design: Todos.dc.html). */
export function TaskChip({ task, spaceSlug }) {
  if (!task) return null
  return (
    <Link
      to={paths.space(spaceSlug).task(task.id)}
      className="flex h-5.5 max-w-65 shrink-0 items-center gap-1.5 rounded-sm bg-muted px-2 text-xs text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CornerDownRight className="size-3 shrink-0" aria-hidden />
      <TaskStatusIcon status={task.status} className="shrink-0" />
      <span className="truncate">{task.title}</span>
    </Link>
  )
}
