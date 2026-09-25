import { CornerDownRight } from 'lucide-react'
import { Link } from 'react-router'
import { formatTime } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { ItemMarker } from '@/features/calendar/components/ItemMarker'

const ROW =
  'flex h-5 w-full min-w-0 items-center gap-1.5 rounded-sm px-1 text-left text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring'

/**
 * One calendar chip for an event, a task or a todo (`entry` from `groupItemsByDay`).
 * - Event: dot, start time (timed, first day) and title; opens the event (`onOpenEvent`). Later
 *   days of a multi-day event show a continuation arrow instead of the time.
 * - Task: hollow square and title, linking to the task. Done tasks keep full contrast.
 * - Todo: the square is its checkbox (`onToggleTodo`); the title opens it on the Todos page.
 * Colours come from the item's space (`spaces.color`), never the space accent variable.
 */
export function CalendarChip({ entry, timeZone, onOpenEvent, onToggleTodo }) {
  const { item, isStart } = entry
  const { spaceById } = useSpace()
  const p = useSpacePaths()
  const color = spaceById.get(item.space_id)?.color

  if (item.kind === 'event') {
    return (
      <button
        type="button"
        onClick={() => onOpenEvent(item)}
        className={cn(ROW, 'hover:bg-accent')}
        title={item.title}
      >
        {isStart ? (
          <ItemMarker kind="event" color={color} />
        ) : (
          <CornerDownRight className="size-3 shrink-0 text-faint" aria-label="Continues" />
        )}
        {isStart && !item.allDay && (
          <span className="shrink-0 font-mono text-faint tabular-nums">
            {formatTime(item.start, timeZone)}
          </span>
        )}
        <span className="truncate">{item.title}</span>
      </button>
    )
  }

  if (item.kind === 'task') {
    return (
      <Link to={p.task(item.id)} className={cn(ROW, 'hover:bg-accent')} title={item.title}>
        <ItemMarker kind={item.kind} color={color} done={item.done} />
        <span className="truncate">{item.title}</span>
      </Link>
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
        <ItemMarker kind={item.kind} color={color} done={item.done} />
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
