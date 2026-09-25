import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { slideX } from '@/components/motion/presets'
import { Skeleton } from '@/components/ui/skeleton'
import { MonthDayCell } from '@/features/calendar/components/MonthDayCell'
import { buildMonthGrid, weekdayLabels } from '@/features/calendar/utils'

// Hairlines between cells only: no right border on the last column, none below the last row.
const cellBorders = (i) => cn(i % 7 !== 6 && 'border-r', i < 35 && 'border-b')

/**
 * The 6-week month grid (design: Calendar, month). `entriesByDay` comes from `groupItemsByDay`.
 * While `loading`, each cell shows placeholder bars instead of chips. A new month slides in from
 * the side it came from (`direction`).
 */
export function MonthView({
  date,
  today,
  weekStartsOn,
  entriesByDay,
  loading,
  direction,
  timeZone,
  onCreate,
  onOpenEvent,
  onToggleTodo,
}) {
  const cells = buildMonthGrid(date, weekStartsOn, today)
  const variants = slideX(direction)
  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border">
      <div className="grid grid-cols-7 border-b">
        {weekdayLabels(weekStartsOn).map((label) => (
          <div key={label} className="px-3 py-2 text-xs text-muted-foreground">
            {label}
          </div>
        ))}
      </div>
      <motion.div
        key={cells[0].isoDate}
        initial={variants.initial}
        animate={variants.animate}
        className="grid flex-1 auto-rows-fr grid-cols-7"
      >
        {cells.map((cell, i) =>
          loading ? (
            <div
              key={cell.isoDate}
              className={cn('flex min-h-30 flex-col gap-1.5 p-1.5', cellBorders(i))}
              aria-hidden
            >
              <Skeleton className="size-6 rounded-full" />
              {i % 3 === 0 && <Skeleton className="h-3.5 w-4/5" />}
              {i % 4 === 1 && <Skeleton className="h-3.5 w-3/5" />}
            </div>
          ) : (
            <MonthDayCell
              key={cell.isoDate}
              cell={cell}
              entries={entriesByDay.get(cell.isoDate) ?? []}
              timeZone={timeZone}
              onCreate={onCreate}
              onOpenEvent={onOpenEvent}
              onToggleTodo={onToggleTodo}
              className={cellBorders(i)}
            />
          ),
        )}
      </motion.div>
    </div>
  )
}
