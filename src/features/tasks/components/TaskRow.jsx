import { GitPullRequestArrow } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PriorityMenu, StatusMenu, TaskActionsMenu } from '@/features/tasks/components/TaskMenus'
import { TaskPriorityIcon, TaskStatusIcon } from '@/features/tasks/components/TaskPills'
import { TASK_PRIORITY_MAP, TASK_STATUS_MAP } from '@/features/tasks/constants'
import { isClosed, linkHost } from '@/features/tasks/utils'

/** Dense list row (design Foundations → task row): priority, status, title, meta, due. */
export function TaskRow({ task, space, showSpace, onEdit, onSetField, onDelete }) {
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
      {showSpace && <SpaceBadge space={space} />}
      {task.external_url && (
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href={task.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground"
              aria-label={`Open link (${linkHost(task.external_url)})`}
            >
              <GitPullRequestArrow className="size-3.5" />
            </a>
          </TooltipTrigger>
          <TooltipContent>{linkHost(task.external_url)}</TooltipContent>
        </Tooltip>
      )}
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
