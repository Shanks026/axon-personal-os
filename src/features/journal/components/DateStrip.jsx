import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useJournalDates } from '@/features/journal/api'
import { buildStripDays, shiftStrip, stripDayLabels, toDateSet } from '@/features/journal/utils'

function PageButton({ label, onClick, children }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={onClick}
          className="text-muted-foreground"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

/**
 * The journal's two-week day strip (design Journal.dc): ‹ a 14-day grid ›. Each 56px day shows
 * the weekday, the day number and a dot when it has an entry. The selection's card background
 * glides between days (`layoutId`). ‹ › page the strip by two weeks without changing the day;
 * selecting a day outside the visible range (Today, alt+arrows, a link) re-centres it. The dots
 * come from the visible range's entries in `spaceIds` (any of them, in Global).
 * @param {{ selected: string, today: string, spaceIds: string[], weekStartsOn: number, onSelect: (iso: string) => void }} props
 */
export function DateStrip({ selected, today, spaceIds, weekStartsOn, onSelect }) {
  const [anchor, setAnchor] = useState(selected)
  const [lastSelected, setLastSelected] = useState(selected)
  let days = buildStripDays(anchor, { weekStartsOn })
  // Adjust during render (no effect): a selection that lands off-strip re-anchors it.
  if (selected !== lastSelected) {
    setLastSelected(selected)
    if (!days.includes(selected)) {
      setAnchor(selected)
      days = buildStripDays(selected, { weekStartsOn })
    }
  }

  const { data: rows } = useJournalDates({ spaceIds, from: days[0], to: days[days.length - 1] })
  const datesWithEntries = useMemo(() => toDateSet(rows), [rows])

  // Narrow screens show one week: the selected day's (the anchor's second week otherwise).
  const shownWeek = days.indexOf(selected) >= 0 ? Math.floor(days.indexOf(selected) / 7) : 1

  return (
    <div className="flex items-center gap-2 border-b px-4 py-3.5 md:px-5">
      <PageButton label="Previous two weeks" onClick={() => setAnchor((a) => shiftStrip(a, -1))}>
        <ChevronLeft />
      </PageButton>
      <div className="grid min-w-0 flex-1 grid-cols-7 gap-1 sm:grid-cols-14">
        {days.map((iso, i) => {
          const labels = stripDayLabels(iso)
          const isSelected = iso === selected
          const isToday = iso === today
          const hasEntry = datesWithEntries.has(iso)
          return (
            <button
              key={iso}
              type="button"
              aria-pressed={isSelected}
              aria-label={`${labels.long}${hasEntry ? ', has entry' : ''}`}
              onClick={() => onSelect(iso)}
              className={cn(
                'relative flex h-14 flex-col items-center justify-center gap-0.75 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
                Math.floor(i / 7) !== shownWeek && 'max-sm:hidden',
                !isSelected && 'hover:bg-accent/60',
              )}
            >
              {isSelected && (
                <motion.span
                  layoutId="journal-date-indicator"
                  transition={springs.snappy}
                  className="absolute inset-0 rounded-lg border border-border-strong bg-card shadow-xs"
                />
              )}
              <span
                className={cn(
                  'relative text-xs',
                  isToday ? 'font-medium text-foreground' : 'text-faint',
                )}
              >
                {labels.weekday}
              </span>
              <span
                className={cn(
                  'relative text-base tabular-nums',
                  isSelected || isToday ? 'font-semibold' : 'font-normal',
                  iso > today ? 'text-faint' : 'text-foreground',
                )}
              >
                {labels.day}
              </span>
              <span
                className={cn(
                  'relative size-1 rounded-full',
                  hasEntry ? (isSelected ? 'bg-foreground' : 'bg-border-strong') : 'bg-transparent',
                )}
                aria-hidden
              />
            </button>
          )
        })}
      </div>
      <PageButton label="Next two weeks" onClick={() => setAnchor((a) => shiftStrip(a, 1))}>
        <ChevronRight />
      </PageButton>
    </div>
  )
}
