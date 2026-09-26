import { useCallback, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { Skeleton } from '@/components/ui/skeleton'
import { NowLine } from '@/features/calendar/components/NowLine'
import { TimeGridEvent } from '@/features/calendar/components/TimeGridEvent'
import { useSlotSelection } from '@/features/calendar/hooks/useSlotSelection'
import { eventMinutesOnDay, layoutDayEvents, minutesToTime } from '@/features/calendar/utils'

const HOURS = Array.from({ length: 24 }, (_, h) => h)

/**
 * One day in the Week/Day grid: 24 hour rows, the day's timed events laid out side by side, the
 * slot-selection ghost, and the now-line when it's today. It's a drop target for moved events.
 * Click-drag on empty space picks a range (`onCreateRange(day, startMin, endMin)`).
 */
export function TimeGridColumn({
  day,
  isToday,
  isWeekend,
  entries,
  loading,
  now,
  timeZone,
  onOpenEvent,
  onCreateRange,
}) {
  const { spaceById } = useSpace()
  const { setNodeRef, isOver } = useDroppable({ id: `day:${day}`, data: { day } })
  const onSelect = useCallback(
    (startMin, endMin) => onCreateRange(day, startMin, endMin),
    [onCreateRange, day],
  )
  const { ghost, onPointerDown } = useSlotSelection({ onSelect })

  const blocks = useMemo(() => {
    const timed = entries.map(({ item, isEnd }) => ({
      item,
      isEnd,
      ...eventMinutesOnDay(item, day, timeZone),
    }))
    const layouts = new Map(
      layoutDayEvents(
        timed.map((t) => ({ id: t.item.id, startMin: t.startMin, endMin: t.endMin })),
      ).map((l) => [l.id, l]),
    )
    return timed.map((t) => ({ ...t, layout: layouts.get(t.item.id) }))
  }, [entries, day, timeZone])

  return (
    <div
      ref={setNodeRef}
      data-day={day}
      onPointerDown={onPointerDown}
      className={cn(
        'relative h-336 min-w-0 border-l transition-colors',
        isWeekend && 'bg-muted/40',
        isOver && 'bg-accent/40',
      )}
    >
      {HOURS.map((h) => (
        <div key={h} className="pointer-events-none h-14 border-b border-border/70" />
      ))}
      {loading &&
        [9, 13].map((h) => (
          <Skeleton
            key={h}
            className="pointer-events-none absolute inset-x-1 h-12"
            style={{ top: `${(h / 24) * 100}%` }}
          />
        ))}
      {!loading &&
        blocks.map(({ item, isEnd, layout }) => (
          <TimeGridEvent
            key={item.id}
            item={item}
            day={day}
            isEnd={isEnd}
            layout={layout}
            color={spaceById.get(item.space_id)?.color}
            timeZone={timeZone}
            onOpen={onOpenEvent}
          />
        ))}
      {ghost && (
        <div
          className="pointer-events-none absolute inset-x-1 z-3 flex items-start rounded-md border border-dashed border-border-strong bg-accent/60 px-1.5 py-1 font-mono text-xs text-muted-foreground"
          style={{
            top: `${(ghost.startMin / 1440) * 100}%`,
            height: `${((ghost.endMin - ghost.startMin) / 1440) * 100}%`,
          }}
        >
          {minutesToTime(ghost.startMin)}–{minutesToTime(ghost.endMin)}
        </div>
      )}
      {isToday && <NowLine now={now} timeZone={timeZone} />}
    </div>
  )
}
