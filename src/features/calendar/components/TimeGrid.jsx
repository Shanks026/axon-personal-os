import { useLayoutEffect, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { parseISODate, zonedParts } from '@/lib/dates'
import { cn } from '@/lib/utils'
import { useSpace } from '@/context/SpaceContext'
import { useNow } from '@/hooks/useNow'
import { TimeGridColumn } from '@/features/calendar/components/TimeGridColumn'
import { TimeGridEventBody } from '@/features/calendar/components/TimeGridEventBody'
import { TimeGridHeader } from '@/features/calendar/components/TimeGridHeader'
import { HOUR_HEIGHT, SCROLL_TO_HOUR, SNAP_MINUTES } from '@/features/calendar/constants'
import { snapModifier } from '@/features/calendar/utils'

const HOURS = Array.from({ length: 24 }, (_, h) => h)
const STEP_PX = (HOUR_HEIGHT / 60) * SNAP_MINUTES // 14px = 15 minutes
const MODIFIERS = [snapModifier(STEP_PX)]
// Literal classes (Tailwind can't see template-built ones).
const GRID_COLS = { 1: 'grid-cols-1', 7: 'grid-cols-7' }

/**
 * The Week (7 days) and Day (1 day) time grid (design: Calendar, week). A sticky header with the
 * all-day chips, a 56px hour gutter, and one column per day, 56px per hour. It scrolls with the
 * page (the shell's content column is the only scroll container) and opens at 08:00, or near the
 * now-line after 18:00 today.
 *
 * Drag an event to move it (15-minute snap, across days), drag its bottom bar to resize it, and
 * click-drag empty space to create one. Drops call `onMoveEvent(event, { dayDelta, minuteDelta })`
 * and `onResizeEvent(event, minuteDelta)` with the raw event row.
 */
export function TimeGrid({
  days,
  today,
  entriesByDay,
  loading,
  timeZone,
  onOpenEvent,
  onToggleTodo,
  onCreateRange,
  onMoveEvent,
  onResizeEvent,
}) {
  const { spaceById } = useSpace()
  const now = useNow()
  const headerRef = useRef(null)
  const anchorRef = useRef(null)
  const [active, setActive] = useState(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // Open at 08:00 (or two hours before now, late on today). Mount only: moving between weeks
  // keeps the scroll position.
  const [scrollHour] = useState(() => {
    if (!days.includes(today)) return SCROLL_TO_HOUR
    const hour = Number(zonedParts(new Date(), timeZone).time.slice(0, 2))
    return hour >= 18 ? hour - 2 : SCROLL_TO_HOUR
  })
  useLayoutEffect(() => {
    const anchor = anchorRef.current
    if (!anchor) return
    anchor.style.scrollMarginTop = `${(headerRef.current?.offsetHeight ?? 0) + 8}px`
    anchor.scrollIntoView?.({ block: 'start' })
  }, [])

  const onDragEnd = ({ active: a, over, delta }) => {
    setActive(null)
    const { kind, item, day } = a.data.current
    const minuteDelta = Math.round(delta.y / STEP_PX) * SNAP_MINUTES
    if (kind === 'resize') {
      onResizeEvent(item.raw, minuteDelta)
      return
    }
    if (!over) return
    const dayDelta = days.indexOf(over.data.current.day) - days.indexOf(day)
    onMoveEvent(item.raw, { dayDelta, minuteDelta })
  }

  const gridCols = GRID_COLS[days.length] ?? GRID_COLS[7]
  const activeItem = active?.kind === 'move' ? active.item : null

  return (
    <div className="flex flex-col rounded-xl border">
      <div ref={headerRef}>
        <TimeGridHeader
          days={days}
          today={today}
          entriesByDay={entriesByDay}
          timeZone={timeZone}
          gridCols={gridCols}
          onOpenEvent={onOpenEvent}
          onToggleTodo={onToggleTodo}
        />
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        modifiers={MODIFIERS}
        onDragStart={({ active: a }) => setActive(a.data.current)}
        onDragCancel={() => setActive(null)}
        onDragEnd={onDragEnd}
      >
        <div className="flex">
          <div className="relative w-14 shrink-0" aria-hidden>
            {HOURS.map((h) => (
              <div key={h} className="h-14 pr-2 text-right">
                {h > 0 && (
                  <span className="relative -top-2 font-mono text-xs text-faint tabular-nums">
                    {String(h).padStart(2, '0')}:00
                  </span>
                )}
              </div>
            ))}
            <div
              ref={anchorRef}
              className="absolute inset-x-0 h-px"
              style={{ top: scrollHour * HOUR_HEIGHT }}
            />
          </div>
          <div className={cn('grid flex-1', gridCols)}>
            {days.map((day) => {
              const dow = parseISODate(day).getDay()
              return (
                <TimeGridColumn
                  key={day}
                  day={day}
                  isToday={day === today}
                  isWeekend={dow === 0 || dow === 6}
                  entries={(entriesByDay.get(day) ?? []).filter(
                    ({ item }) => item.kind === 'event' && !item.allDay,
                  )}
                  loading={loading}
                  now={now}
                  timeZone={timeZone}
                  onOpenEvent={onOpenEvent}
                  onCreateRange={onCreateRange}
                />
              )
            })}
          </div>
        </div>
        <DragOverlay dropAnimation={null}>
          {activeItem && (
            <div className="h-full cursor-grabbing px-0.5">
              <TimeGridEventBody
                item={activeItem}
                color={spaceById.get(activeItem.space_id)?.color}
                timeZone={timeZone}
                short={new Date(activeItem.end) - new Date(activeItem.start) < 30 * 60_000}
                lifted
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
