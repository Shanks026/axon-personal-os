import { useState } from 'react'
import { addDays, nextFriday, nextMonday } from 'date-fns'
import { parseISODate, toISODate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

const QUICK = [
  { label: 'Today', date: () => new Date() },
  { label: 'Tomorrow', date: () => addDays(new Date(), 1) },
  { label: 'Fri', date: () => nextFriday(new Date()) },
  { label: 'Next week', date: () => nextMonday(new Date()) },
]

/**
 * Date popover (design Foundations → Date picker): quick chips, then a month calendar.
 * `value` / `onChange` use 'yyyy-MM-dd' strings (or null). `children` is the trigger element.
 * `open`/`onOpenChange` make it controllable (e.g. hover-to-open); omit them for the default
 * internal (click-to-open) state. `contentProps` passes extra props to the popover content,
 * such as hover handlers that keep it open while the pointer is over it.
 */
export function DatePicker({
  value,
  onChange,
  children,
  clearable = true,
  align = 'start',
  weekStartsOn = 1,
  open: openProp,
  onOpenChange: onOpenChangeProp,
  contentProps,
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = openProp ?? internalOpen
  const setOpen = onOpenChangeProp ?? setInternalOpen
  const selected = parseISODate(value) ?? undefined

  function pick(date) {
    onChange(date ? toISODate(date) : null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-3" {...contentProps}>
        <div className="mb-2 flex flex-wrap gap-1.5">
          {QUICK.map((q) => (
            <Button
              key={q.label}
              type="button"
              variant="outline"
              size="xs"
              onClick={() => pick(q.date())}
            >
              {q.label}
            </Button>
          ))}
        </div>
        <Calendar
          mode="single"
          selected={selected}
          defaultMonth={selected}
          onSelect={pick}
          weekStartsOn={weekStartsOn}
          className="p-0"
        />
        {clearable && value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-muted-foreground"
            onClick={() => pick(null)}
          >
            Clear date
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}
