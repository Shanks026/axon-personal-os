import { useEffect, useMemo, useState } from 'react'
import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'
import { springs } from '@/components/motion/presets'
import { Button } from '@/components/ui/button'
import { Carousel, CarouselContent, CarouselItem } from '@/components/ui/carousel'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useJournalDates } from '@/features/journal/api'
import { buildStripWeeks, stripDayLabels, toDateSet, weekIndexOf } from '@/features/journal/utils'

/** Weeks shown before the selected one: 1 from `sm` up (two weeks on screen), else 0 (one). */
const leadWeeks = () => (window.matchMedia('(min-width: 640px)').matches ? 1 : 0)

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

function DayButton({ iso, selected, today, hasEntry, onSelect }) {
  const labels = stripDayLabels(iso)
  const isSelected = iso === selected
  const isToday = iso === today
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      aria-label={`${labels.long}${hasEntry ? ', has entry' : ''}`}
      onClick={() => onSelect(iso)}
      className={cn(
        'relative flex h-14 flex-col items-center justify-center gap-0.75 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring',
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
        className={cn('relative text-xs', isToday ? 'font-medium text-foreground' : 'text-faint')}
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
}

/**
 * The journal's day strip (design Journal.dc): a carousel of weeks (shadcn Carousel on Embla),
 * two on screen (one on phones). It drags with the mouse or a finger and follows two-finger
 * trackpad swipes (`embla-carousel-wheel-gestures`), snapping week by week; ‹ › move two weeks.
 * Each 56px day shows the weekday, the day number and a dot when it has an entry in `spaceIds`
 * (any of them, in Global). The selection's card background glides between days (`layoutId`).
 * The strip spans `JOURNAL_STRIP_WEEKS` either side of the selection; picking a day beyond it
 * (mini month, a link) re-centres it, and a selection scrolled out of view is brought back.
 * @param {{ selected: string, today: string, spaceIds: string[], weekStartsOn: number, onSelect: (iso: string) => void }} props
 */
export function DateStrip({ selected, today, spaceIds, weekStartsOn, onSelect }) {
  const [anchor, setAnchor] = useState(selected)
  const weeks = useMemo(() => buildStripWeeks(anchor, { weekStartsOn }), [anchor, weekStartsOn])
  const selectedWeek = weekIndexOf(weeks, selected)
  // Adjust during render (no effect): a selection beyond the strip re-centres it.
  if (selectedWeek < 0) setAnchor(selected)

  const [api, setApi] = useState()
  const [plugins] = useState(() => [WheelGesturesPlugin()])
  const [opts] = useState(() => ({
    align: 'start',
    containScroll: 'trimSnaps',
    startIndex: Math.max(0, selectedWeek - leadWeeks()),
  }))

  // Bring the selected week into view when it changes (Today, alt+arrows, the mini month).
  // Far jumps (a re-centred strip) land instantly instead of sliding across months.
  useEffect(() => {
    if (!api || selectedWeek < 0 || api.slidesInView().includes(selectedWeek)) return
    const target = Math.max(0, selectedWeek - leadWeeks())
    api.scrollTo(target, Math.abs(target - api.selectedScrollSnap()) > 4)
  }, [api, selectedWeek, anchor])

  const { data: rows } = useJournalDates({
    spaceIds,
    from: weeks[0][0],
    to: weeks[weeks.length - 1][6],
  })
  const datesWithEntries = useMemo(() => toDateSet(rows), [rows])

  const page = (n) => api?.scrollTo(api.selectedScrollSnap() + n)

  return (
    <div className="flex items-center gap-2 border-b px-4 py-3.5 md:px-5">
      <PageButton label="Previous two weeks" onClick={() => page(-2)}>
        <ChevronLeft />
      </PageButton>
      <Carousel
        setApi={setApi}
        opts={opts}
        plugins={plugins}
        className="min-w-0 flex-1"
        aria-label="Days"
      >
        <CarouselContent className="-ml-1 cursor-grab select-none active:cursor-grabbing">
          {weeks.map((week) => (
            <CarouselItem key={week[0]} className="pl-1 sm:basis-1/2">
              <div className="grid grid-cols-7 gap-1">
                {week.map((iso) => (
                  <DayButton
                    key={iso}
                    iso={iso}
                    selected={selected}
                    today={today}
                    hasEntry={datesWithEntries.has(iso)}
                    onSelect={onSelect}
                  />
                ))}
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
      <PageButton label="Next two weeks" onClick={() => page(2)}>
        <ChevronRight />
      </PageButton>
    </div>
  )
}
