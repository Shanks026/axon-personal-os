import { useMemo, useState } from 'react'
import { CalendarDays } from 'lucide-react'
import { parseISODate, toISODate } from '@/lib/dates'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useJournalDates } from '@/features/journal/api'
import { monthGridRange, monthLabel } from '@/features/journal/utils'

// A 4px dot under the day number (the cell is `relative`; the dot paints over the day button).
const HAS_ENTRY =
  'after:pointer-events-none after:absolute after:bottom-0.5 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-border-strong'

/**
 * The header's "Sep 2026" button (design Journal.dc): a mini month for jumping to any day, with a
 * dot on days that have an entry in `spaceIds` (any of them, in Global). The dots follow the
 * month on screen; picking a day calls `onSelect(iso)` and closes.
 * @param {{ selected: string, spaceIds: string[], weekStartsOn: number, onSelect: (iso: string) => void }} props
 */
export function JournalMonthPopover({ selected, spaceIds, weekStartsOn, onSelect }) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseISODate(selected)
  const [month, setMonth] = useState(selectedDate)
  const { from, to } = monthGridRange(month, weekStartsOn)
  const { data: rows } = useJournalDates({ spaceIds, from, to })
  const hasEntry = useMemo(
    () => [...new Set((rows ?? []).map((r) => r.journal_date))].map(parseISODate),
    [rows],
  )

  const onOpenChange = (next) => {
    if (next) setMonth(selectedDate) // reopen on the selected day's month
    setOpen(next)
  }

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-muted-foreground">
          <CalendarDays />
          {monthLabel(selected)}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-3">
        <Calendar
          mode="single"
          required
          selected={selectedDate}
          month={month}
          onMonthChange={setMonth}
          weekStartsOn={weekStartsOn}
          modifiers={{ hasEntry }}
          modifiersClassNames={{ hasEntry: HAS_ENTRY }}
          onSelect={(date) => {
            if (date) onSelect(toISODate(date))
            setOpen(false)
          }}
          className="p-0"
        />
      </PopoverContent>
    </Popover>
  )
}
