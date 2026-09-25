import { useState } from 'react'
import { formatWeekdayDate } from '@/lib/dates'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { CalendarChip } from '@/features/calendar/components/CalendarChip'

/** "+N more" in a month cell: a popover listing every item on that day. */
export function MoreItemsPopover({
  isoDate,
  entries,
  hiddenCount,
  timeZone,
  onOpenEvent,
  onToggleTodo,
}) {
  const [open, setOpen] = useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-5 items-center rounded-sm px-1 text-left text-xs text-muted-foreground outline-none hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          +{hiddenCount} more
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 p-2">
        <p className="px-1 pb-1.5 font-mono text-xs text-muted-foreground">
          {formatWeekdayDate(isoDate)}
        </p>
        <div className="flex max-h-72 flex-col gap-0.5 overflow-y-auto">
          {entries.map((entry) => (
            <CalendarChip
              key={entry.item.kind + entry.item.id}
              entry={entry}
              timeZone={timeZone}
              onOpenEvent={(item) => {
                setOpen(false)
                onOpenEvent(item)
              }}
              onToggleTodo={onToggleTodo}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}
