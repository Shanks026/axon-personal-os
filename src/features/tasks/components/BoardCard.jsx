import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { DueLabel } from '@/components/shared/DueLabel'
import { SpaceIcon } from '@/components/shared/SpaceIcon'
import { TagPillGroup } from '@/components/shared/TagPill'
import { TaskActionsMenu } from '@/features/tasks/components/TaskMenus'
import { TaskLinksButton } from '@/features/tasks/components/TaskLinksButton'
import { TaskPriorityPill } from '@/features/tasks/components/TaskPills'
import { isClosed } from '@/features/tasks/utils'
import { ChecklistProgressBadge } from '@/features/todos/components/ChecklistProgressBadge'

// Controls inside a draggable card: keep their pointer and key presses from starting a drag.
const stopDrag = {
  onPointerDown: (e) => e.stopPropagation(),
  onKeyDown: (e) => e.stopPropagation(),
}

/**
 * Board card (design 04c): priority pill and MR icon on top, the title, tags, then a dashed
 * footer with the space (Global only), the due label and a hover menu. `overlay` is the lifted
 * copy.
 */
export function BoardCard({
  task,
  space,
  showSpace,
  tags,
  progress,
  onEdit,
  onDelete,
  overlay = false,
}) {
  const closed = isClosed(task)
  const hasTop = task.priority !== 'none' || task.links?.length > 0
  return (
    <article
      className={cn(
        'group flex flex-col gap-2.5 rounded-xl border bg-card p-3.5 transition-colors duration-(--dur-fast)',
        overlay ? 'cursor-grabbing border-border-strong shadow-md' : 'hover:border-border-strong',
      )}
    >
      {hasTop && (
        <div className="flex h-5.5 items-center gap-1.5">
          <TaskPriorityPill priority={task.priority} className="h-5.5" />
          <div className="flex-1" />
          <TaskLinksButton
            links={task.links}
            size="size-5.5"
            className="rounded-md bg-transparent"
            triggerProps={{ onClick: (e) => e.stopPropagation(), ...stopDrag }}
          />
        </div>
      )}

      <h3
        className={cn(
          'leading-snug font-semibold text-pretty',
          closed && 'text-muted-foreground line-through decoration-faint',
        )}
      >
        {task.title}
      </h3>
      {tags?.length > 0 && <TagPillGroup tags={tags} className="flex-wrap" />}

      <footer className="box-content flex h-6 items-center gap-2 border-t border-dashed border-border-strong pt-2.5">
        {showSpace && (
          <>
            <SpaceIcon icon={space?.icon} size="sm" />
            <span className="truncate text-xs font-medium">{space?.name}</span>
          </>
        )}
        <ChecklistProgressBadge progress={progress} />
        <div className="flex-1" />
        <DueLabel date={task.due_date} completedAt={task.completed_at} closed={closed} />
        {!overlay && (
          <span
            onClick={(e) => e.stopPropagation()}
            {...stopDrag}
            className="-mr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100 has-data-[state=open]:opacity-100"
          >
            <TaskActionsMenu
              task={task}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task)}
            />
          </span>
        )}
      </footer>
    </article>
  )
}

/**
 * Draggable wrapper. While its card is lifted, the card stays in place (keeping the list's
 * measurements) but shows as the dashed accent drop slot. Click or Enter opens `onEdit`;
 * Space picks the card up for keyboard dragging.
 */
export function SortableBoardCard({ task, ...props }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      {...attributes}
      {...listeners}
      aria-label={task.title}
      onClick={() => props.onEdit(task)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !isDragging) props.onEdit(task)
        else listeners?.onKeyDown?.(e)
      }}
      className={cn(
        'cursor-grab rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring',
        isDragging && 'border-2 border-dashed border-space bg-space-soft',
      )}
    >
      <div className={cn(isDragging && 'invisible')}>
        <BoardCard task={task} {...props} />
      </div>
    </div>
  )
}
