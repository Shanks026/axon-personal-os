import { NodeViewWrapper } from '@tiptap/react'
import { badgeClasses } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { EntityLink } from '@/components/shared/EntityLink'
import { useTaskSummary } from '@/features/tasks/api'

/**
 * Node view for a `[[task]]` mention: an `EntityLink` chip with the task's **live** title and
 * status (it follows changes made elsewhere), falling back to the saved label while loading.
 * A task that's gone or in Trash reads muted and struck through. Mentions use the blue badge
 * (never the space colour, the user's request). Selected: the accent ring.
 */
export function TaskMentionChip({ node, selected }) {
  const { id, label } = node.attrs
  const { data: task, isLoading } = useTaskSummary(id)

  return (
    <NodeViewWrapper
      as="span"
      contentEditable={false}
      className={cn('mx-px rounded-md', selected && 'ring-2 ring-ring')}
    >
      {isLoading ? (
        <span
          className={cn(
            'inline-flex h-6 items-center rounded-md px-2 align-middle text-sm leading-none',
            badgeClasses('blue'),
          )}
        >
          {label}
        </span>
      ) : (
        <EntityLink
          kind="task"
          id={id}
          spaceId={task?.space_id}
          label={task?.title ?? label}
          status={task?.status}
          deleted={!task || !!task.deleted_at}
          tone="blue"
        />
      )}
    </NodeViewWrapper>
  )
}
