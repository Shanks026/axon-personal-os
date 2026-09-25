import { CalendarDays, CornerDownRight, MapPin, Plus } from 'lucide-react'
import { Link } from 'react-router'
import { formatTimeRange, formatTime, formatWeekdayDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { EmptyState } from '@/components/shared/EmptyState'
import { SpaceBadge } from '@/components/shared/SpaceBadge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useSpacePaths } from '@/features/spaces/hooks/useSpacePaths'
import { ItemMarker } from '@/features/calendar/components/ItemMarker'
import { formatAgendaDay } from '@/features/calendar/utils'

function timeLabel({ item, isStart, isEnd }, timeZone) {
  if (item.kind !== 'event') return 'Due'
  if (item.allDay) return 'All day'
  if (isStart && isEnd) return formatTimeRange(item.start, item.end, timeZone)
  if (isStart) return `From ${formatTime(item.start, timeZone)}`
  if (isEnd) return `Until ${formatTime(item.end, timeZone)}`
  return 'All day'
}

const ROW =
  'flex min-h-11 w-full min-w-0 items-center gap-3 rounded-md px-2 text-left outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring'

function AgendaRow({ entry, timeZone, isGlobal, spaceById, onOpenEvent, onToggleTodo }) {
  const p = useSpacePaths()
  const { item, isStart } = entry
  const space = spaceById.get(item.space_id)
  const time = (
    <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
      {timeLabel(entry, timeZone)}
    </span>
  )
  const trailing = (
    <>
      {item.kind === 'event' && item.raw.location && (
        <span className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          <span className="truncate">{item.raw.location}</span>
        </span>
      )}
      <span className="flex-1" />
      {isGlobal && <SpaceBadge space={space} />}
    </>
  )

  if (item.kind === 'event') {
    return (
      <button type="button" className={ROW} onClick={() => onOpenEvent(item)}>
        {time}
        {isStart ? (
          <ItemMarker kind="event" color={space?.color} className="mx-0.5" />
        ) : (
          <CornerDownRight className="size-3 shrink-0 text-faint" aria-label="Continues" />
        )}
        <span className="min-w-0 truncate">{item.title}</span>
        {trailing}
      </button>
    )
  }
  if (item.kind === 'task') {
    return (
      <Link to={p.task(item.id)} className={ROW}>
        {time}
        <ItemMarker kind="task" color={space?.color} done={item.done} />
        <span className="min-w-0 truncate">{item.title}</span>
        {trailing}
      </Link>
    )
  }
  return (
    <div className={cn(ROW, 'focus-visible:ring-0')}>
      {time}
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={item.done ? `Mark “${item.title}” not done` : `Mark “${item.title}” done`}
        onClick={() => onToggleTodo(item)}
        className="-m-1 flex shrink-0 items-center justify-center rounded-sm p-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ItemMarker kind="todo" color={space?.color} done={item.done} />
      </button>
      <Link
        to={p.todos({ highlight: item.id })}
        className={cn(
          'min-w-0 truncate outline-none focus-visible:underline',
          item.done && 'text-muted-foreground line-through',
        )}
      >
        {item.title}
      </Link>
      {trailing}
    </div>
  )
}

/**
 * The next 30 days (from the current date), grouped by day with sticky day headers. Only days
 * with something on them are listed; an empty range shows the empty state.
 */
export function AgendaView({
  days,
  entriesByDay,
  today,
  loading,
  timeZone,
  onCreate,
  onOpenEvent,
  onToggleTodo,
}) {
  const { isGlobal, spaceById } = useSpace()

  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-11 items-center gap-3 px-2">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className={cn('h-3.5', i % 2 ? 'w-1/3' : 'w-1/2')} />
          </div>
        ))}
      </div>
    )
  }

  const withItems = days.filter((d) => entriesByDay.get(d)?.length)
  if (!withItems.length) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nothing in the next 30 days"
        description="Events, and tasks or todos with a due date, show up here."
        action={
          <Button onClick={() => onCreate()}>
            <Plus />
            New event
          </Button>
        }
      />
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {withItems.map((day) => (
        <section key={day} aria-label={formatWeekdayDate(day)}>
          <h3 className="sticky top-0 z-10 flex items-baseline gap-2 border-b bg-background px-2 py-2">
            <span className={cn('font-medium', day === today && 'text-destructive')}>
              {formatAgendaDay(day, today)}
            </span>
            {formatAgendaDay(day, today) !== formatWeekdayDate(day) && (
              <span className="font-mono text-xs text-muted-foreground">
                {formatWeekdayDate(day)}
              </span>
            )}
          </h3>
          <div className="flex flex-col pt-1">
            {entriesByDay.get(day).map((entry) => (
              <AgendaRow
                key={entry.item.kind + entry.item.id}
                entry={entry}
                timeZone={timeZone}
                isGlobal={isGlobal}
                spaceById={spaceById}
                onOpenEvent={onOpenEvent}
                onToggleTodo={onToggleTodo}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
