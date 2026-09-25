import { NodeViewWrapper } from '@tiptap/react'
import { SquareCheckBig } from 'lucide-react'
import { MENTION_CLASSES } from '@/lib/tint'
import { cn } from '@/lib/utils'
import { EntityLink } from '@/components/shared/EntityLink'
import { useTaskSummary } from '@/features/tasks/api'

/**
 * Node view for a `[[task]]` mention: an `EntityLink` chip with the task's **live** title and
 * status (it follows changes made elsewhere), falling back to the saved label while loading.
 * A task that's gone or in Trash reads muted and struck through. Mentions use `MENTION_CLASSES`
 * in both states (never the space colour, no status icon: the user's request); the hover card
 * shows the status and details. Selected: the accent ring.
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
            'inline-flex h-6 items-center gap-1.5 rounded-md px-2 align-middle text-sm leading-none',
            MENTION_CLASSES,
          )}
        >
          <SquareCheckBig className="size-3.5 shrink-0" aria-hidden />
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
