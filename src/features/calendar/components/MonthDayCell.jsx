import { formatWeekdayDate } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { CalendarChip } from '@/features/calendar/components/CalendarChip'
import { MoreItemsPopover } from '@/features/calendar/components/MoreItemsPopover'
import { MAX_CHIPS_PER_DAY } from '@/features/calendar/constants'

/**
 * One day in the month grid. The day number is a button that starts a new event on that day.
 * Up to `MAX_CHIPS_PER_DAY` chips show; beyond that the last slot becomes "+N more".
 */
export function MonthDayCell({
  cell,
  entries,
  timeZone,
  onCreate,
  onOpenEvent,
  onToggleTodo,
  className,
}) {
  const overflow = entries.length > MAX_CHIPS_PER_DAY
  const shown = overflow ? entries.slice(0, MAX_CHIPS_PER_DAY - 1) : entries
  return (
    <div
      className={cn(
        'flex min-h-30 min-w-0 flex-col gap-0.5 overflow-hidden border-border p-1.5',
        cell.isWeekend && 'bg-muted/40',
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onCreate(cell.isoDate)}
        aria-label={`New event on ${formatWeekdayDate(cell.isoDate)}`}
        className={cn(
          'mb-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring',
          cell.isToday
            ? 'bg-destructive font-semibold text-white'
            : cell.inMonth
              ? 'text-foreground hover:bg-accent'
              : 'text-faint hover:bg-accent',
        )}
      >
        {cell.day}
      </button>
      {shown.map((entry) => (
        <CalendarChip
          key={entry.item.kind + entry.item.id}
          entry={entry}
          timeZone={timeZone}
          onOpenEvent={onOpenEvent}
          onToggleTodo={onToggleTodo}
        />
      ))}
      {overflow && (
        <MoreItemsPopover
          isoDate={cell.isoDate}
          entries={entries}
          hiddenCount={entries.length - shown.length}
          timeZone={timeZone}
          onOpenEvent={onOpenEvent}
          onToggleTodo={onToggleTodo}
        />
      )}
    </div>
  )
}
