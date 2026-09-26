import { X } from 'lucide-react'
import { EntityLink } from '@/components/shared/EntityLink'
import { Button } from '@/components/ui/button'
import { useTaskSummary } from '@/features/tasks/api'

/** The event dialog's linked task: a chip with a hover preview, and an unlink ✕ on hover. */
export function EventLinkedTask({ taskId, onRemove }) {
  const { data: task } = useTaskSummary(taskId)
  return (
    <span className="group/linked flex min-w-0 items-center gap-1">
      <EntityLink
        kind="task"
        id={taskId}
        spaceId={task?.space_id}
        label={task?.title ?? 'Loading…'}
        status={task?.status}
        deleted={!!task?.deleted_at}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        onClick={onRemove}
        aria-label="Unlink task"
        className="text-muted-foreground opacity-0 group-hover/linked:opacity-100 focus-visible:opacity-100"
      >
        <X />
      </Button>
    </span>
  )
}
