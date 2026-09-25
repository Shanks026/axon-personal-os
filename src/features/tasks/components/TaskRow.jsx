import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { TagPillGroup } from '@/components/shared/TagPill'
import { Button } from '@/components/ui/button'
import { PriorityMenu, StatusMenu, TaskActionsMenu } from '@/features/tasks/components/TaskMenus'
import { TaskLinksButton } from '@/features/tasks/components/TaskLinksButton'
import { TaskPriorityIcon, TaskStatusIcon } from '@/features/tasks/components/TaskPills'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'
import { isClosed } from '@/features/tasks/utils'
import { ChecklistProgressBadge } from '@/features/todos/components/ChecklistProgressBadge'

/** Dense list row (design Foundations → task row): priority, status, title, tags, meta, due. */
export function TaskRow({ task, space, showSpace, tags, progress, onEdit, onSetField, onDelete }) {
  const closed = isClosed(task)
  return (
    <div className="group flex h-11 items-center gap-2.5 border-b px-3 transition-colors hover:bg-muted">
      <PriorityMenu value={task.priority} onChange={(v) => onSetField(task, 'priority', v)}>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Priority: ${TASK_PRIORITY_MAP[task.priority]?.label}`}
        >
          <TaskPriorityIcon priority={task.priority} />
        </Button>
      </PriorityMenu>
      <StatusMenu value={task.status} onChange={(v) => onSetField(task, 'status', v)}>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Status: ${TASK_STATUS_MAP[task.status]?.label}`}
        >
          <TaskStatusIcon status={task.status} />
        </Button>
      </StatusMenu>
      <button
        type="button"
        onClick={() => onEdit(task)}
        className={cn(
          'min-w-0 flex-1 truncate rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring',
          closed && 'text-muted-foreground line-through decoration-faint',
        )}
      >
        {task.title}
      </button>
      <TagPillGroup tags={tags} max={2} />
      <ChecklistProgressBadge progress={progress} />
      {showSpace && <SpaceBadge space={space} />}
      <TaskLinksButton links={task.links} size="size-6" iconSize="size-3.5" className="bg-transparent" />
      <DueLabel
        date={task.due_date}
        completedAt={task.completed_at}
        closed={closed}
        showEmpty={false}
        className="w-28 text-right"
      />
      <TaskActionsMenu
        task={task}
        vertical={false}
        onEdit={() => onEdit(task)}
        onDelete={() => onDelete(task)}
      />
    </div>
  )
}
