import { useDraggable } from '@dnd-kit/core'
import { Link, useNavigate } from 'react-router'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { ChipFace } from '@/features/calendar/components/ChipFace'
import { ItemMarker } from '@/features/calendar/components/ItemMarker'

const ROW =
  'flex h-5 w-full min-w-0 items-center gap-1.5 rounded-sm px-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * One calendar chip for an event, a task or a todo (`entry` from `groupItemsByDay`).
 * - Event: dot, start time and title; opens the event (`onOpenEvent`).
 * - Task: hollow square and title; opens the task. Done tasks keep full contrast.
 * - Todo: the square is its checkbox (`onToggleTodo`); the title opens it on the Todos page.
 *
 * With `draggable` (Month), events and tasks can be dragged to another day (`day` is the cell the
 * chip sits in). Tasks navigate with a button, not a `Link`: dnd-kit stops a post-drag click from
 * propagating but not its default action, so a dragged link would load the page. Colours come
 * from the item's space (`spaces.color`), never the space accent variable.
 */
export function CalendarChip({
  entry,
  day,
  timeZone,
  draggable = false,
  onOpenEvent,
  onToggleTodo,
}) {
  const { item, isStart } = entry
  const { spaceById } = useSpace()
  const p = useSpacePaths()
  const navigate = useNavigate()
  const color = spaceById.get(item.space_id)?.color
  const canDrag = draggable && item.kind !== 'todo'
  const drag = useDraggable({
    id: `chip:${item.kind}:${item.id}:${day}`,
    data: { item, day },
    disabled: !canDrag,
  })
  const dragProps = canDrag ? { ref: drag.setNodeRef, ...drag.listeners, ...drag.attributes } : {}

  if (item.kind !== 'todo') {
    return (
      <button
        type="button"
        {...dragProps}
        onClick={() => (item.kind === 'event' ? onOpenEvent(item) : navigate(p.task(item.id)))}
        className={cn(ROW, 'hover:bg-accent', drag.isDragging && 'opacity-40')}
        title={item.title}
      >
        <ChipFace item={item} isStart={isStart} color={color} timeZone={timeZone} />
      </button>
    )
  }

  return (
    <div className={cn(ROW, 'pr-0 hover:bg-accent')}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? `Mark “${item.title}” not done` : `Mark “${item.title}” done`}
        onClick={() => onToggleTodo(item)}
        className="-m-1 flex shrink-0 items-center justify-center rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ItemMarker kind="todo" color={color} done={item.done} />
      </button>
      <Link
        to={p.todos({ highlight: item.id })}
        title={item.title}
        className={cn(
          'min-w-0 flex-1 truncate outline-none focus-visible:underline',
          item.done && 'text-muted-foreground line-through',
        )}
      >
        {item.title}
      </Link>
    </div>
  )
}
