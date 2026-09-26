import { parseISODate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { CalendarChip } from '@/features/calendar/components/CalendarChip'
import { weekdayLabels } from '@/features/calendar/utils'

/**
 * The sticky day header of the Week/Day grid (design: week view). Each cell shows the weekday and
 * day number (today in destructive red), then that day's all-day events and due task/todo chips:
 * the design keeps the all-day row inside the header cells.
 */
export function TimeGridHeader({
  days,
  today,
  entriesByDay,
  timeZone,
  gridCols,
  onOpenEvent,
  onToggleTodo,
}) {
  const labels = weekdayLabels(0) // Sun…Sat, indexed by getDay()
  return (
    <div className="sticky top-0 z-10 flex rounded-t-xl border-b bg-background">
      <div className="w-14 shrink-0" />
      <div className={cn('grid flex-1', gridCols)}>
        {days.map((day) => {
          const d = parseISODate(day)
          const isToday = day === today
          const allDay = (entriesByDay.get(day) ?? []).filter(
            ({ item }) => item.kind !== 'event' || item.allDay,
          )
          return (
            <div
              key={day}
              className="flex min-h-19.5 min-w-0 flex-col gap-1.5 border-l px-2 pt-2.5 pb-2"
            >
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs text-muted-foreground">{labels[d.getDay()]}</span>
                <span
                  className={cn(
                    'text-lg tabular-nums',
                    isToday ? 'font-semibold text-destructive' : 'text-foreground',
                  )}
                >
                  {d.getDate()}
                </span>
              </div>
              {allDay.map((entry) => (
                <CalendarChip
                  key={entry.item.kind + entry.item.id}
                  entry={entry}
                  timeZone={timeZone}
                  onOpenEvent={onOpenEvent}
                  onToggleTodo={onToggleTodo}
                />
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
