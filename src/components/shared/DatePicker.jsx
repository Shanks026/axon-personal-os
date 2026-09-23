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
 */
export function DatePicker({
  value,
  onChange,
  children,
  clearable = true,
  align = 'start',
  weekStartsOn = 1,
}) {
  const [open, setOpen] = useState(false)
  const selected = parseISODate(value) ?? undefined

  function pick(date) {
    onChange(date ? toISODate(date) : null)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align={align} className="w-auto p-3">
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
